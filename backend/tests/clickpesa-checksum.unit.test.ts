import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizePayload,
  computeClickPesaChecksum,
  verifyClickPesaChecksum,
} from "../src/modules/commercial/adapters/clickpesa-checksum.validator.js";

test("Task 5.A3 — ClickPesa Webhook Checksum & Canonicalization Unit Suite", async (t) => {
  const secret = "test-webhook-secret-key-1234567890";

  await t.test("canonicalizePayload: sorts object keys recursively and excludes signature fields", () => {
    const raw = {
      zebra: 100,
      alpha: "start",
      checksum: "should-be-omitted",
      checksumMethod: "sha256",
      signature: "omit-me-too",
      nested: {
        z: 9,
        a: 1,
        m: 5,
      },
    };

    const canonical = canonicalizePayload(raw) as Record<string, unknown>;

    assert.equal("checksum" in canonical, false);
    assert.equal("checksumMethod" in canonical, false);
    assert.equal("signature" in canonical, false);

    const keys = Object.keys(canonical);
    assert.deepEqual(keys, ["alpha", "nested", "zebra"]);

    const nestedKeys = Object.keys(canonical.nested as Record<string, unknown>);
    assert.deepEqual(nestedKeys, ["a", "m", "z"]);
  });

  await t.test("computeClickPesaChecksum & verifyClickPesaChecksum: valid checksum verifies successfully", () => {
    const payload = {
      orderReference: "CP1234567890",
      amount: 5000,
      currency: "TZS",
      status: "SUCCESS",
      transactionId: "TX_998877",
    };

    const checksum = computeClickPesaChecksum(payload, secret);
    assert.equal(typeof checksum, "string");
    assert.equal(checksum.length, 64); // SHA256 hex length

    const isValid = verifyClickPesaChecksum(payload, secret, checksum);
    assert.equal(isValid, true);
  });

  await t.test("verifyClickPesaChecksum: handles payload with inline checksum property", () => {
    const payload = {
      orderReference: "CP1234567890",
      amount: 5000,
      status: "SETTLED",
    };

    const checksum = computeClickPesaChecksum(payload, secret);
    const payloadWithChecksum = {
      ...payload,
      checksum,
      checksumMethod: "sha256",
    };

    const isValid = verifyClickPesaChecksum(payloadWithChecksum, secret, checksum);
    assert.equal(isValid, true);
  });

  await t.test("verifyClickPesaChecksum: rejects tampered payload", () => {
    const payload = {
      orderReference: "CP1234567890",
      amount: 5000,
      status: "SUCCESS",
    };

    const checksum = computeClickPesaChecksum(payload, secret);

    // Tamper with amount
    const tamperedPayload = {
      ...payload,
      amount: 100,
    };

    const isValid = verifyClickPesaChecksum(tamperedPayload, secret, checksum);
    assert.equal(isValid, false);
  });

  await t.test("verifyClickPesaChecksum: rejects forged signature or invalid secret", () => {
    const payload = {
      orderReference: "CP1234567890",
      amount: 5000,
      status: "SUCCESS",
    };

    const checksum = computeClickPesaChecksum(payload, secret);

    assert.equal(verifyClickPesaChecksum(payload, "wrong-secret-key-123", checksum), false);
    assert.equal(verifyClickPesaChecksum(payload, secret, "00".repeat(32)), false);
    assert.equal(verifyClickPesaChecksum(payload, secret, "short-garbage"), false);
    assert.equal(verifyClickPesaChecksum(payload, "", checksum), false);
  });
});
