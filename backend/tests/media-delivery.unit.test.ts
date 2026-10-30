import test from "node:test";
import assert from "node:assert/strict";
import { JwtPlaybackSignerAdapter } from "../src/modules/media/adapters/jwt-playback-signer.adapter.js";
import { LocalSimulatorMediaAdapter } from "../src/modules/media/adapters/local-simulator-media.adapter.js";

test("Task 5.B1 — Media Delivery & Playback Signer Unit Suite", async (t) => {
  const secret = "test-playback-signer-secret-key-32-chars";

  await t.test("JwtPlaybackSignerAdapter: generates and verifies valid playback token", async () => {
    const signer = new JwtPlaybackSignerAdapter({ secret, defaultTtlSeconds: 900 });

    const token = await signer.generatePlaybackToken({
      customerId: "user-123",
      contentId: "content-abc",
      editionId: "edition-xyz",
      djId: "dj-456",
      ttlSeconds: 600,
    });

    assert.equal(typeof token, "string");
    const parts = token.split(".");
    assert.equal(parts.length, 3);

    const claims = await signer.verifyPlaybackToken(token);
    assert.ok(claims);
    assert.equal(claims.sub, "user-123");
    assert.equal(claims.contentId, "content-abc");
    assert.equal(claims.editionId, "edition-xyz");
    assert.equal(claims.djId, "dj-456");
    assert.equal(claims.iss, "giftedpro-playback");
    assert.ok(claims.exp > claims.iat);
    assert.ok(claims.jti.length > 0);
  });

  await t.test("JwtPlaybackSignerAdapter: rejects tampered token", async () => {
    const signer = new JwtPlaybackSignerAdapter({ secret });

    const token = await signer.generatePlaybackToken({
      customerId: "user-123",
      contentId: "content-abc",
    });

    const parts = token.split(".");
    // Tamper with payload (middle segment)
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "hacker-user", contentId: "content-abc", iss: "giftedpro-playback", exp: 9999999999 }),
      "utf8",
    ).toString("base64url");

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const result = await signer.verifyPlaybackToken(tamperedToken);
    assert.equal(result, null);
  });

  await t.test("JwtPlaybackSignerAdapter: rejects expired token", async () => {
    const signer = new JwtPlaybackSignerAdapter({ secret });

    // Generate token with negative TTL
    const token = await signer.generatePlaybackToken({
      customerId: "user-123",
      contentId: "content-abc",
      ttlSeconds: -10,
    });

    const result = await signer.verifyPlaybackToken(token);
    assert.equal(result, null);
  });

  await t.test("JwtPlaybackSignerAdapter: rejects invalid signature or wrong secret", async () => {
    const signer1 = new JwtPlaybackSignerAdapter({ secret });
    const signer2 = new JwtPlaybackSignerAdapter({ secret: "completely-different-signing-secret" });

    const token = await signer1.generatePlaybackToken({
      customerId: "user-123",
      contentId: "content-abc",
    });

    const result = await signer2.verifyPlaybackToken(token);
    assert.equal(result, null);
  });

  await t.test("LocalSimulatorMediaAdapter: generates presigned URLs and tracks objects", async () => {
    const adapter = new LocalSimulatorMediaAdapter();

    const presigned = await adapter.generatePresignedUploadUrl({
      storageKey: "raw/movies/m1/ed1/streaming/test.mp4",
      contentType: "video/mp4",
      expiresInSeconds: 1800,
    });

    assert.ok(presigned.uploadUrl.includes("media-sim.giftedpro.test"));
    assert.equal(presigned.storageKey, "raw/movies/m1/ed1/streaming/test.mp4");
    assert.equal(presigned.expiresInSeconds, 1800);

    // Not yet uploaded
    assert.equal(await adapter.verifyObjectExists(presigned.storageKey), false);

    // Simulate upload completion
    adapter.simulateUpload(presigned.storageKey);
    assert.equal(await adapter.verifyObjectExists(presigned.storageKey), true);

    // Playback URL
    const playbackUrl = adapter.getPlaybackUrl("movies/m1/master.m3u8");
    assert.equal(playbackUrl, "https://stream.giftedpro.test/hls/movies/m1/master.m3u8");

    // Deletion
    await adapter.deleteObject(presigned.storageKey);
    assert.equal(await adapter.verifyObjectExists(presigned.storageKey), false);
  });

  await t.test("LocalSimulatorMediaAdapter: origin access verification enforces valid signed playback tokens", async () => {
    const adapter = new LocalSimulatorMediaAdapter();
    const signer = new JwtPlaybackSignerAdapter({ secret, defaultTtlSeconds: 900 });

    const validToken = await signer.generatePlaybackToken({
      customerId: "cust-1",
      contentId: "content-1",
      ttlSeconds: 600,
    });

    // 1. Valid request to manifest with valid signed token
    const validUrl = `${adapter.getPlaybackUrl("movies/m1/master.m3u8")}?token=${validToken}`;
    const validResult = await adapter.verifyOriginAccess(validUrl, signer);
    assert.equal(validResult.allowed, true);

    // 2. Request without token is denied
    const missingTokenUrl = adapter.getPlaybackUrl("movies/m1/master.m3u8");
    const missingResult = await adapter.verifyOriginAccess(missingTokenUrl, signer);
    assert.equal(missingResult.allowed, false);
    assert.equal(missingResult.reason, "MISSING_PLAYBACK_TOKEN");

    // 3. Request with tampered token is denied
    const tamperedUrl = `${adapter.getPlaybackUrl("movies/m1/master.m3u8")}?token=${validToken}tampered`;
    const tamperedResult = await adapter.verifyOriginAccess(tamperedUrl, signer);
    assert.equal(tamperedResult.allowed, false);
    assert.equal(tamperedResult.reason, "INVALID_OR_EXPIRED_TOKEN");

    // 4. Request with expired token is denied
    const expiredToken = await signer.generatePlaybackToken({
      customerId: "cust-1",
      contentId: "content-1",
      ttlSeconds: -10,
    });
    const expiredUrl = `${adapter.getPlaybackUrl("movies/m1/master.m3u8")}?token=${expiredToken}`;
    const expiredResult = await adapter.verifyOriginAccess(expiredUrl, signer);
    assert.equal(expiredResult.allowed, false);
    assert.equal(expiredResult.reason, "INVALID_OR_EXPIRED_TOKEN");
  });

  await t.test("R2MediaStorageAdapter: generates presigned upload/download URLs and handles object lifecycle with mock S3Client", async () => {
    const { R2MediaStorageAdapter } = await import(
      "../src/modules/media/adapters/r2-media-storage.adapter.js"
    );

    // Track commands sent through mock S3Client
    const sentCommands: unknown[] = [];
    const mockS3Client = {
      send: async (command: unknown) => {
        sentCommands.push(command);
        const cmdName = (command as { constructor: { name: string } }).constructor.name;
        if (cmdName === "HeadObjectCommand") {
          const key = (command as { input: { Key: string } }).input.Key;
          if (key === "nonexistent/file.bin") {
            const err = Object.assign(new Error("Not Found"), {
              name: "NotFound",
              $metadata: { httpStatusCode: 404 },
            });
            throw err;
          }
          return { ContentLength: 1024, ContentType: "video/mp4" };
        }
        if (cmdName === "DeleteObjectCommand") {
          return {};
        }
        return {};
      },
    };

    const adapter = new R2MediaStorageAdapter({
      accountId: "07e862129ce4083b383e85e2bf2ff0f8",
      accessKeyId: "mock-access-key",
      secretAccessKey: "mock-secret-key",
      bucketName: "giftedpro-staging-media-downloads",
      s3Client: mockS3Client as any,
    });

    assert.equal(adapter.providerName, "r2");

    // 1. Presigned upload URL
    const uploadResult = await adapter.generatePresignedUploadUrl({
      storageKey: "/raw/movies/m1/source.mp4",
      contentType: "video/mp4",
      expiresInSeconds: 3600,
    });
    assert.equal(uploadResult.storageKey, "raw/movies/m1/source.mp4"); // stripped leading slash
    assert.equal(uploadResult.expiresInSeconds, 3600);
    assert.ok(uploadResult.uploadUrl.includes("https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com"));

    // 2. Presigned download URL
    const downloadUrl = await adapter.generatePresignedDownloadUrl({
      storageKey: "downloads/movies/m1/edition1.mp4",
      expiresInSeconds: 900,
    });
    assert.ok(downloadUrl.includes("https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com"));

    // 3. Object existence verification
    const exists = await adapter.verifyObjectExists("raw/movies/m1/source.mp4");
    assert.equal(exists, true);

    const notExists = await adapter.verifyObjectExists("nonexistent/file.bin");
    assert.equal(notExists, false);

    // 4. Object deletion
    await adapter.deleteObject("raw/movies/m1/source.mp4");
    assert.ok(sentCommands.some((c: any) => c.constructor.name === "DeleteObjectCommand"));

    // 5. Rejection of path traversal keys
    await assert.rejects(
      async () => adapter.generatePresignedUploadUrl({ storageKey: "../etc/passwd", contentType: "text/plain" }),
      /Invalid storage key/,
    );
  });

  await t.test("MediaService: enforces customer streaming lockout with 503 STREAMING_COMING_SOON when customerStreamingEnabled is false", async () => {
    const { MediaService } = await import("../src/modules/media/media.service.js");
    const { ServiceUnavailableException } = await import("@nestjs/common");

    const mockEnv = {
      customerStreamingEnabled: false,
    };
    const mockDb = {} as any;
    const mockAccessService = {} as any;
    const mockAuditService = {} as any;
    const mockStorage = {} as any;
    const mockSigner = {} as any;

    const service = new MediaService(
      mockDb,
      mockAccessService,
      mockAuditService,
      mockStorage,
      mockSigner,
      mockEnv as any,
    );

    try {
      await service.authorizePlayback("cust-123", { contentId: "movie-abc" });
      assert.fail("Expected ServiceUnavailableException");
    } catch (err: unknown) {
      assert.ok(err instanceof ServiceUnavailableException);
      const res = (err as any).getResponse();
      assert.equal(res.statusCode, 503);
      assert.equal(res.code, "STREAMING_COMING_SOON");
      assert.ok(res.message.includes("STREAMING_COMING_SOON"));
    }
  });
});

