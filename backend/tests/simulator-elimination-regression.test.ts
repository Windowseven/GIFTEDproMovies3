import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { InvalidEnvironmentError, loadEnvironment } from "../src/config/environment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = existsSync(join(__dirname, "..", "..", "src"))
  ? join(__dirname, "..", "..")
  : join(__dirname, "..");
const backendSrcDir = join(backendRoot, "src");

function getAllSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
      files.push(fullPath);
    }
  }
  return files;
}

test("Architecture Regression: Complete Elimination of Media Storage Simulator", async (t) => {
  await t.test("REG-01: LocalSimulatorMediaAdapter file does not exist on disk", () => {
    const deletedAdapterPath = join(
      backendSrcDir,
      "modules",
      "media",
      "adapters",
      "local-simulator-media.adapter.ts",
    );
    assert.equal(
      existsSync(deletedAdapterPath),
      false,
      "local-simulator-media.adapter.ts must not exist in repository",
    );
  });

  await t.test("REG-02: No source code in backend/src references LocalSimulatorMediaAdapter or media-sim", () => {
    const sourceFiles = getAllSourceFiles(backendSrcDir);
    assert.ok(sourceFiles.length > 0, "Source files must be discovered");

    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      assert.ok(
        !content.includes("LocalSimulatorMediaAdapter"),
        `Source file ${file} must not reference LocalSimulatorMediaAdapter`,
      );
      assert.ok(
        !content.includes("media-sim"),
        `Source file ${file} must not reference simulated media URL prefix 'media-sim'`,
      );
    }
  });

  await t.test("REG-03: MediaModule DI container always resolves to R2MediaStorageAdapter without fallback branches", () => {
    const mediaModuleContent = readFileSync(
      join(backendSrcDir, "modules", "media", "media.module.ts"),
      "utf8",
    );

    // Verify R2MediaStorageAdapter is used
    assert.ok(
      mediaModuleContent.includes("R2MediaStorageAdapter"),
      "MediaModule must use R2MediaStorageAdapter",
    );

    // Verify no fallback or provider branching in MediaModule
    assert.ok(
      !mediaModuleContent.includes("LocalSimulatorMediaAdapter"),
      "MediaModule must not reference LocalSimulatorMediaAdapter",
    );
    assert.ok(
      !mediaModuleContent.includes("mediaStorageProvider"),
      "MediaModule must not conditionally branch on mediaStorageProvider",
    );
  });

  await t.test("REG-04: MediaService download authorization contains no simulator token fallback", () => {
    const mediaServiceContent = readFileSync(
      join(backendSrcDir, "modules", "media", "media.service.ts"),
      "utf8",
    );

    // Verify generatePresignedDownloadUrl is called directly and unconditionally
    assert.ok(
      mediaServiceContent.includes("this.storage.generatePresignedDownloadUrl"),
      "MediaService must call generatePresignedDownloadUrl",
    );

    // Verify the legacy fallback pattern 'baseDownloadUrl?token=' is completely absent
    assert.ok(
      !mediaServiceContent.includes("baseDownloadUrl?token="),
      "MediaService must not build fallback simulated download URLs with ?token=",
    );
    assert.ok(
      !mediaServiceContent.includes("this.storage.getPlaybackUrl(downloadFileKey)"),
      "MediaService must not call getPlaybackUrl for customer downloads",
    );
  });

  await t.test("REG-05: Environment configuration rejects MEDIA_STORAGE_PROVIDER explicitly", () => {
    const validBase = {
      APP_ENV: "test",
      DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
      CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
      R2_ACCESS_KEY_ID: "test-r2-access-key-id",
      R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
      R2_BUCKET_NAME: "giftedpro-staging-media-downloads",
      R2_ENDPOINT: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
    };

    assert.throws(
      () =>
        loadEnvironment({
          ...validBase,
          MEDIA_STORAGE_PROVIDER: "simulator",
        }),
      (err: unknown) =>
        err instanceof InvalidEnvironmentError &&
        err.message.includes("MEDIA_STORAGE_PROVIDER") &&
        err.message.includes("is no longer supported"),
    );

    assert.throws(
      () =>
        loadEnvironment({
          ...validBase,
          MEDIA_STORAGE_PROVIDER: "r2",
        }),
      (err: unknown) =>
        err instanceof InvalidEnvironmentError &&
        err.message.includes("MEDIA_STORAGE_PROVIDER") &&
        err.message.includes("is no longer supported"),
    );
  });

  await t.test("REG-06: Production and test startup strictly fail fast if any R2 configuration is missing", () => {
    const validBase = {
      APP_ENV: "test",
      DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
      CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
      R2_ACCESS_KEY_ID: "test-r2-access-key-id",
      R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
      R2_BUCKET_NAME: "giftedpro-staging-media-downloads",
      R2_ENDPOINT: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
    };

    // Missing CLOUDFLARE_ACCOUNT_ID
    assert.throws(
      () => loadEnvironment({ ...validBase, CLOUDFLARE_ACCOUNT_ID: undefined }),
      /CLOUDFLARE_ACCOUNT_ID.*is required/,
    );

    // Missing R2_ACCESS_KEY_ID
    assert.throws(
      () => loadEnvironment({ ...validBase, R2_ACCESS_KEY_ID: undefined }),
      /R2_ACCESS_KEY_ID.*is required/,
    );

    // Missing R2_SECRET_ACCESS_KEY
    assert.throws(
      () => loadEnvironment({ ...validBase, R2_SECRET_ACCESS_KEY: undefined }),
      /R2_SECRET_ACCESS_KEY.*is required/,
    );

    // Missing R2_BUCKET_NAME
    assert.throws(
      () => loadEnvironment({ ...validBase, R2_BUCKET_NAME: undefined }),
      /R2_BUCKET_NAME.*is required/,
    );

    // Missing R2_ENDPOINT
    assert.throws(
      () => loadEnvironment({ ...validBase, R2_ENDPOINT: undefined }),
      /R2_ENDPOINT.*is required/,
    );
  });
});
