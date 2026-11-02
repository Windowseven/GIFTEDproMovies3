import test from "node:test";
import assert from "node:assert/strict";
import { JwtPlaybackSignerAdapter } from "../src/modules/media/adapters/jwt-playback-signer.adapter.js";

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

  await t.test("R2MediaStorageAdapter: constructor validates required parameters", async () => {
    const { R2MediaStorageAdapter } = await import(
      "../src/modules/media/adapters/r2-media-storage.adapter.js"
    );

    assert.throws(
      () =>
        new R2MediaStorageAdapter({
          accountId: "acc-1",
          accessKeyId: "key-1",
          secretAccessKey: "sec-1",
          bucketName: "   ",
        }),
      /bucketName is required/,
    );

    assert.throws(
      () =>
        new R2MediaStorageAdapter({
          accountId: "",
          accessKeyId: "key-1",
          secretAccessKey: "sec-1",
          bucketName: "my-bucket",
        }),
      /accountId, accessKeyId, and secretAccessKey are required/,
    );
  });

  await t.test("R2MediaStorageAdapter: generates presigned upload/download URLs and handles object lifecycle with mock S3Client", async () => {
    const { R2MediaStorageAdapter } = await import(
      "../src/modules/media/adapters/r2-media-storage.adapter.js"
    );
    const { S3Client } = await import("@aws-sdk/client-s3");

    // Track commands sent through S3Client
    const sentCommands: unknown[] = [];
    const mockS3Client = new S3Client({
      region: "auto",
      endpoint: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "mock-access-key",
        secretAccessKey: "mock-secret-key",
      },
    });

    mockS3Client.send = (async (command: unknown) => {
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
        if (key === "error/file.bin") {
          const err = Object.assign(new Error("Internal R2 Error"), {
            name: "InternalError",
            $metadata: { httpStatusCode: 500 },
          });
          throw err;
        }
        return { ContentLength: 1024, ContentType: "video/mp4" };
      }
      if (cmdName === "DeleteObjectCommand") {
        return {};
      }
      return {};
    }) as any;

    const adapter = new R2MediaStorageAdapter({
      accountId: "07e862129ce4083b383e85e2bf2ff0f8",
      accessKeyId: "mock-access-key",
      secretAccessKey: "mock-secret-key",
      bucketName: "giftedpro-staging-media-downloads",
      s3Client: mockS3Client,
    });

    assert.equal(adapter.providerName, "r2");

    // 1. Presigned upload URL
    const uploadResult = await adapter.generatePresignedUploadUrl({
      storageKey: "/raw/movies/m1/source.mp4",
      contentType: "video/mp4",
      expiresInSeconds: 3600,
    });
    assert.equal(uploadResult.storageKey, "raw/movies/m1/source.mp4"); // stripped leading slash
    assert.ok(uploadResult.uploadUrl.includes("07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com"));
    assert.ok(uploadResult.uploadUrl.includes("giftedpro-staging-media-downloads"));

    // 2. Presigned download URL
    const downloadUrl = await adapter.generatePresignedDownloadUrl({
      storageKey: "downloads/movies/m1/edition1.mp4",
      expiresInSeconds: 900,
    });
    assert.ok(downloadUrl.includes("07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com"));
    assert.ok(downloadUrl.includes("giftedpro-staging-media-downloads"));

    // 3. Object existence verification
    const exists = await adapter.verifyObjectExists("raw/movies/m1/source.mp4");
    assert.equal(exists, true);

    const notExists = await adapter.verifyObjectExists("nonexistent/file.bin");
    assert.equal(notExists, false);

    await assert.rejects(
      async () => adapter.verifyObjectExists("error/file.bin"),
      /Internal R2 Error/,
    );

    // 4. Object deletion
    await adapter.deleteObject("raw/movies/m1/source.mp4");
    assert.ok(sentCommands.some((c: any) => c.constructor.name === "DeleteObjectCommand"));

    // 5. Canonical storage playback URL
    const playbackUrl = adapter.getPlaybackUrl("raw/movies/m1/source.mp4");
    assert.equal(
      playbackUrl,
      "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com/giftedpro-staging-media-downloads/raw/movies/m1/source.mp4",
    );

    // 6. Rejection of path traversal keys
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

  await t.test("MediaService: download authorization directly invokes R2 generatePresignedDownloadUrl without simulation tokens", async () => {
    const { MediaService } = await import("../src/modules/media/media.service.js");

    let presignedCalledWith: any = null;
    const mockStorage = {
      providerName: "r2",
      generatePresignedDownloadUrl: async (params: any) => {
        presignedCalledWith = params;
        return `https://r2.cloudflarestorage.com/bucket/${params.storageKey}?X-Amz-Signature=mock-sig`;
      },
    };

    const editionData = [
      {
        id: "ed-1",
        movieId: "movie-1",
        isAvailable: true,
        downloadStatus: "ready",
        downloadFileKey: "downloads/movies/m1/ed1.mp4",
        isDefault: true,
      },
    ];

    const makeQueryResult = (data: any[]) => {
      const arr: any = [...data];
      arr.limit = (n: number) => arr.slice(0, n);
      arr.orderBy = () => arr;
      return arr;
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => makeQueryResult(editionData),
        }),
      }),
      transaction: async (cb: any) => {
        const tx = {
          execute: async () => ({ rows: [{ cnt: 0 }] }),
          select: () => ({
            from: () => ({
              where: () => makeQueryResult([]),
            }),
          }),
          insert: () => ({
            values: () => ({}),
          }),
        };
        return cb(tx);
      },
    };

    const mockAccessService = {
      canAccess: async () => ({
        granted: true,
        entitlementId: "ent-1",
        orderId: "ord-1",
        planVersionId: "pv-1",
        grantType: "PURCHASE",
      }),
    };

    const mockAuditService = {
      recordEvent: async () => {},
    };

    const mockSigner = {
      generatePlaybackToken: async () => "token-xyz",
    };

    const mockEnv = {
      customerStreamingEnabled: false,
    };

    const service = new MediaService(
      mockDb as any,
      mockAccessService as any,
      mockAuditService as any,
      mockStorage as any,
      mockSigner as any,
      mockEnv as any,
    );

    const result = await service.authorizeDownload("cust-123", {
      contentId: "movie-1",
      editionId: "ed-1",
    });

    assert.equal(result.authorized, true);
    assert.ok(presignedCalledWith);
    assert.equal(presignedCalledWith.storageKey, "downloads/movies/m1/ed1.mp4");
    assert.equal(presignedCalledWith.expiresInSeconds, 900);
    assert.ok(result.downloadUrl.includes("X-Amz-Signature=mock-sig"));
    assert.ok(!result.downloadUrl.includes("?token="));
    assert.ok(!result.downloadUrl.includes("media-sim"));
  });
});

