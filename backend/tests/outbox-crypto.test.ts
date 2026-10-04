import assert from "node:assert/strict";
import test from "node:test";
import {
  encryptOutboxPayload,
  decryptOutboxPayload,
  PayloadDecryptionError,
} from "../src/infrastructure/email/outbox-crypto.js";

const VALID_KEY_1 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_KEY_2 = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

test("encryptOutboxPayload & decryptOutboxPayload roundtrip successfully", () => {
  const payload = { rawToken: "super_secure_random_token_1234567890", userId: "usr-1" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  assert.ok(bundle.ciphertext);
  assert.ok(bundle.iv);
  assert.ok(bundle.tag);
  assert.equal(bundle.iv.length, 24); // 12 bytes = 24 hex chars
  assert.equal(bundle.tag.length, 32); // 16 bytes = 32 hex chars

  const decrypted = decryptOutboxPayload<typeof payload>(bundle, VALID_KEY_1);
  assert.deepEqual(decrypted, payload);
});

test("encryptOutboxPayload generates unique IV for each encryption", () => {
  const payload = { rawToken: "identical_token" };
  const bundle1 = encryptOutboxPayload(payload, VALID_KEY_1);
  const bundle2 = encryptOutboxPayload(payload, VALID_KEY_1);

  assert.notEqual(bundle1.iv, bundle2.iv);
  assert.notEqual(bundle1.ciphertext, bundle2.ciphertext);
});

test("decryptOutboxPayload rejects tampered ciphertext", () => {
  const payload = { rawToken: "sensitive_token_abc" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  // Flip the last byte of ciphertext
  const tamperedCiphertext =
    bundle.ciphertext.slice(0, -2) + (bundle.ciphertext.slice(-2) === "00" ? "ff" : "00");

  assert.throws(
    () =>
      decryptOutboxPayload(
        { ...bundle, ciphertext: tamperedCiphertext },
        VALID_KEY_1,
      ),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("decryptOutboxPayload rejects tampered auth tag", () => {
  const payload = { rawToken: "sensitive_token_abc" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  // Tamper tag
  const tamperedTag =
    bundle.tag.slice(0, -2) + (bundle.tag.slice(-2) === "aa" ? "bb" : "aa");

  assert.throws(
    () => decryptOutboxPayload({ ...bundle, tag: tamperedTag }, VALID_KEY_1),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("decryptOutboxPayload rejects tampered IV", () => {
  const payload = { rawToken: "sensitive_token_abc" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  const tamperedIv =
    bundle.iv.slice(0, -2) + (bundle.iv.slice(-2) === "11" ? "22" : "11");

  assert.throws(
    () => decryptOutboxPayload({ ...bundle, iv: tamperedIv }, VALID_KEY_1),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("decryptOutboxPayload rejects decryption with incorrect key", () => {
  const payload = { rawToken: "sensitive_token_xyz" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  assert.throws(
    () => decryptOutboxPayload(bundle, VALID_KEY_2),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("encryptOutboxPayload rejects malformed key", () => {
  assert.throws(
    () => encryptOutboxPayload({ token: "test" }, "short_key"),
    /Invalid encryption key/,
  );
  assert.throws(
    () => encryptOutboxPayload({ token: "test" }, "not_hex_chars_".repeat(4)),
    /Invalid encryption key/,
  );
});

test("PayloadDecryptionError does not leak raw secret key in message", () => {
  const payload = { rawToken: "my_secret" };
  const bundle = encryptOutboxPayload(payload, VALID_KEY_1);

  try {
    decryptOutboxPayload(bundle, VALID_KEY_2);
    assert.fail("Should have thrown");
  } catch (err: unknown) {
    assert.ok(err instanceof PayloadDecryptionError);
    assert.ok(!err.message.includes(VALID_KEY_1));
    assert.ok(!err.message.includes(VALID_KEY_2));
    assert.ok(!err.message.includes("my_secret"));
  }
});
