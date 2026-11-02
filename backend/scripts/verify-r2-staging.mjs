import { createHash, randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { R2MediaStorageAdapter } from "../.test-dist/src/modules/media/adapters/r2-media-storage.adapter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

if (!existsSync(envPath)) {
  console.error("FATAL: backend/.env file not found.");
  process.exit(1);
}

const env = dotenv.parse(readFileSync(envPath, "utf8"));
const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = env.R2_BUCKET_NAME?.trim() || "giftedpro-staging-media-downloads";
const endpoint = env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("FATAL: Cloudflare R2 credentials missing in backend/.env.");
  process.exit(1);
}

console.log("=== R2 Staging Verification Preflight ===");
console.log(`Target Bucket: ${bucketName}`);
console.log(`Target Endpoint: ${endpoint}`);
console.log(`Account ID present: ${Boolean(accountId)} (length: ${accountId.length})`);
console.log(`Access Key ID present: ${Boolean(accessKeyId)} (length: ${accessKeyId.length})`);
console.log(`Secret Access Key present: ${Boolean(secretAccessKey)} (length: ${secretAccessKey.length})`);

const adapter = new R2MediaStorageAdapter({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucketName,
  endpoint,
});

const testId = randomUUID();
const storageKey = `staging-verification/${testId}/synthetic-test.bin`;
const payloadSize = 100 * 1024; // 100 KiB
const syntheticPayload = randomBytes(payloadSize);
const originalSha256 = createHash("sha256").update(syntheticPayload).digest("hex");

console.log(`\nGenerated synthetic payload: ${payloadSize} bytes`);
console.log(`Original SHA-256: ${originalSha256}`);
console.log(`Test Key: ${storageKey}`);

let uploadSuccess = false;
let headSuccess = false;
let getSuccess = false;
let rangeSuccess = false;
let deleteSuccess = false;
let verificationConfirmed = false;

try {
  // 1. Generate presigned upload URL
  console.log("\n[Step 1] Generating Presigned Upload URL...");
  const uploadResult = await adapter.generatePresignedUploadUrl({
    storageKey,
    contentType: "application/octet-stream",
    expiresInSeconds: 3600,
  });
  console.log(`Presigned upload URL generated successfully (expires in ${uploadResult.expiresInSeconds}s).`);
  console.log(`Sanitized Target Host: ${new URL(uploadResult.uploadUrl).host}`);

  // 2. Perform direct upload to R2
  console.log("\n[Step 2] Executing Direct HTTP PUT to R2...");
  const putResponse = await fetch(uploadResult.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(payloadSize),
    },
    body: syntheticPayload,
  });

  console.log(`HTTP PUT Status: ${putResponse.status} ${putResponse.statusText}`);
  if (!putResponse.ok) {
    const errorText = await putResponse.text();
    throw new Error(`R2 direct upload failed with status ${putResponse.status}: ${errorText}`);
  }
  uploadSuccess = true;

  // 3. Verify object via HeadObject (Metadata only)
  console.log("\n[Step 3] Verifying object existence via HeadObject...");
  const exists = await adapter.verifyObjectExists(storageKey);
  console.log(`HeadObject verification result: exists = ${exists}`);
  if (!exists) {
    throw new Error("Object verification failed: HeadObject returned false after upload.");
  }
  headSuccess = true;

  // 4. Generate presigned download URL
  console.log("\n[Step 4] Generating Presigned Download URL (900s TTL)...");
  const downloadUrl = await adapter.generatePresignedDownloadUrl({
    storageKey,
    expiresInSeconds: 900,
  });
  console.log(`Presigned download URL generated successfully.`);
  console.log(`Sanitized Target Host: ${new URL(downloadUrl).host}`);

  // 5. Download full object and verify integrity
  console.log("\n[Step 5] Downloading object via Presigned GET and verifying checksum...");
  const getResponse = await fetch(downloadUrl);
  console.log(`HTTP GET Status: ${getResponse.status} ${getResponse.statusText}`);
  if (!getResponse.ok) {
    throw new Error(`R2 direct download failed with status ${getResponse.status}`);
  }
  const downloadedBytes = Buffer.from(await getResponse.arrayBuffer());
  const downloadedSha256 = createHash("sha256").update(downloadedBytes).digest("hex");
  console.log(`Downloaded Size: ${downloadedBytes.length} bytes`);
  console.log(`Downloaded SHA-256: ${downloadedSha256}`);

  if (downloadedBytes.length !== payloadSize || downloadedSha256 !== originalSha256) {
    throw new Error(`Integrity check failed: checksum mismatch!`);
  }
  console.log("Checksum verification: 100% BYTE MATCH (PASSED).");
  getSuccess = true;

  // 6. Test Range GET (bytes=0-1023 -> first 1024 bytes)
  console.log("\n[Step 6] Testing HTTP Range Request (bytes=0-1023)...");
  const rangeResponse = await fetch(downloadUrl, {
    headers: {
      Range: "bytes=0-1023",
    },
  });
  console.log(`HTTP Range GET Status: ${rangeResponse.status} ${rangeResponse.statusText}`);
  const contentRange = rangeResponse.headers.get("content-range");
  const acceptRanges = rangeResponse.headers.get("accept-ranges");
  console.log(`Content-Range Header: ${contentRange}`);
  console.log(`Accept-Ranges Header: ${acceptRanges}`);

  if (rangeResponse.status !== 206) {
    throw new Error(`Expected HTTP 206 Partial Content, got ${rangeResponse.status}`);
  }
  const rangeBytes = Buffer.from(await rangeResponse.arrayBuffer());
  console.log(`Returned Range Bytes: ${rangeBytes.length}`);
  if (rangeBytes.length !== 1024) {
    throw new Error(`Expected 1024 bytes in range response, got ${rangeBytes.length}`);
  }
  const expectedRangeSlice = syntheticPayload.subarray(0, 1024);
  if (!rangeBytes.equals(expectedRangeSlice)) {
    throw new Error("Range bytes content mismatch with original synthetic payload!");
  }
  console.log("HTTP Range verification: VALID 206 PARTIAL CONTENT (PASSED).");
  rangeSuccess = true;

  // 7. Security: Test tampered presigned download URL
  console.log("\n[Step 7] Testing security: tampered presigned URL rejection...");
  const tamperedUrl = downloadUrl + "tamper";
  const tamperedResponse = await fetch(tamperedUrl);
  console.log(`Tampered URL HTTP Status: ${tamperedResponse.status} (Expected 401 or 403)`);
  if (tamperedResponse.status !== 401 && tamperedResponse.status !== 403) {
    throw new Error(`Security breach: Tampered URL returned status ${tamperedResponse.status}`);
  }
  console.log("Tampered URL rejection: PASSED (SignatureDoesNotMatch).");

  // 8. Security: Test unauthorized public access without signature
  console.log("\n[Step 8] Testing security: public bucket access denial...");
  const publicUrl = `${endpoint}/${bucketName}/${storageKey}`;
  const publicResponse = await fetch(publicUrl);
  console.log(`Public unsigned URL HTTP Status: ${publicResponse.status} (Expected 400, 401, 403, or 404)`);
  if (![400, 401, 403, 404].includes(publicResponse.status)) {
    throw new Error(`Security breach: Public unsigned access returned unexpected status ${publicResponse.status}`);
  }
  console.log("Public access denial: PASSED (Unsigned request rejected by R2).");

  verificationConfirmed = true;
} finally {
  // 9. Resource Cleanup
  console.log("\n[Step 9] Resource Cleanup: Deleting synthetic staging test object...");
  try {
    await adapter.deleteObject(storageKey);
    console.log(`Delete command issued for ${storageKey}.`);
    const stillExists = await adapter.verifyObjectExists(storageKey);
    console.log(`Post-deletion existence check: ${stillExists}`);
    if (!stillExists) {
      deleteSuccess = true;
      console.log("Cleanup verification: OBJECT SUCCESSFULLY DELETED (PASSED).");
    } else {
      console.error(`WARNING: Object ${storageKey} still exists after delete!`);
    }
  } catch (cleanErr) {
    console.error("Cleanup error:", cleanErr.message);
  }
}

console.log("\n=== Final Staging Execution Summary ===");
console.log(`Upload Success: ${uploadSuccess}`);
console.log(`HeadObject Success: ${headSuccess}`);
console.log(`Presigned Download Success: ${getSuccess}`);
console.log(`HTTP Range Request Success: ${rangeSuccess}`);
console.log(`Object Deleted: ${deleteSuccess}`);
console.log(`Full Lifecycle Verified: ${verificationConfirmed}`);

if (!verificationConfirmed || !deleteSuccess) {
  process.exit(1);
}
console.log("\n>>> GATE 6.B LIVE OPERATIONAL VERIFICATION: 100% SUCCESS <<<");
