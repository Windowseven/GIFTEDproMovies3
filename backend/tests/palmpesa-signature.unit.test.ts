import test from "node:test";
import assert from "node:assert/strict";
import {
  computePalmPesaSignature,
  verifyPalmPesaSignature,
} from "../src/modules/commercial/adapters/palmpesa-signature.validator.js";

test("PalmPesa Signature & Timestamp Unit Suite", async (t) => {
  const secret = "palmpesa-secret-key-abcdef123456";
  const rawBody = JSON.stringify({
    event: "payment.completed",
    event_id: "evt_123456",
    order_id: "ORD_7890",
    transaction_id: "PP20261022001",
    status: "COMPLETED",
    amount: 10000,
    currency: "TZS",
    phone: "255712345678",
  });

  await t.test("computePalmPesaSignature: produces valid sha256=<hex> prefix format", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = computePalmPesaSignature(rawBody, secret, timestamp);

    assert.equal(typeof sig, "string");
    assert.match(sig, /^sha256=[a-f0-9]{64}$/);
  });

  await t.test("verifyPalmPesaSignature: succeeds with fresh timestamp and valid signature", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computePalmPesaSignature(rawBody, secret, timestamp);

    const valid = verifyPalmPesaSignature(rawBody, secret, signature, timestamp);
    assert.equal(valid, true);

    // Also supports timestamp as string
    const validStringTs = verifyPalmPesaSignature(rawBody, secret, signature, String(timestamp));
    assert.equal(validStringTs, true);
  });

  await t.test("verifyPalmPesaSignature: rejects tampered raw body", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computePalmPesaSignature(rawBody, secret, timestamp);

    const tampered = JSON.stringify({
      ...JSON.parse(rawBody),
      amount: 500, // tampered amount
    });

    const valid = verifyPalmPesaSignature(tampered, secret, signature, timestamp);
    assert.equal(valid, false);
  });

  await t.test("verifyPalmPesaSignature: rejects stale timestamp beyond 300s drift window", () => {
    const now = Math.floor(Date.now() / 1000);
    const staleTimestamp = now - 305; // 305 seconds ago (> 300s window)
    const signature = computePalmPesaSignature(rawBody, secret, staleTimestamp);

    const valid = verifyPalmPesaSignature(rawBody, secret, signature, staleTimestamp);
    assert.equal(valid, false, "Must reject timestamp older than 300 seconds");
  });

  await t.test("verifyPalmPesaSignature: rejects future timestamp beyond 300s drift window", () => {
    const now = Math.floor(Date.now() / 1000);
    const futureTimestamp = now + 400; // 400s into future
    const signature = computePalmPesaSignature(rawBody, secret, futureTimestamp);

    const valid = verifyPalmPesaSignature(rawBody, secret, signature, futureTimestamp);
    assert.equal(valid, false, "Must reject timestamp too far into future");
  });

  await t.test("verifyPalmPesaSignature: accepts timestamp within allowable drift (e.g. 120s)", () => {
    const now = Math.floor(Date.now() / 1000);
    const driftTimestamp = now - 120;
    const signature = computePalmPesaSignature(rawBody, secret, driftTimestamp);

    const valid = verifyPalmPesaSignature(rawBody, secret, signature, driftTimestamp);
    assert.equal(valid, true);
  });

  await t.test("verifyPalmPesaSignature: rejects incorrect secret or forged signature", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computePalmPesaSignature(rawBody, secret, timestamp);

    assert.equal(verifyPalmPesaSignature(rawBody, "wrong-secret", signature, timestamp), false);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, "sha256=" + "00".repeat(32), timestamp), false);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, "malformed-sig", timestamp), false);
  });

  await t.test("verifyPalmPesaSignature: returns false on missing inputs or empty strings", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, undefined, timestamp), false);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, "", timestamp), false);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, "sha256=abc", undefined), false);
    assert.equal(verifyPalmPesaSignature(rawBody, "", "sha256=abc", timestamp), false);
    assert.equal(verifyPalmPesaSignature(rawBody, secret, "sha256=abc", "not-a-number"), false);
  });
});
