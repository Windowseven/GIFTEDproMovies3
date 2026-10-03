import assert from "node:assert/strict";
import test from "node:test";
import {
  generateSecureToken,
  hashToken,
  constantTimeCompare,
} from "../src/modules/identity/utils/token.utils.js";

test("generateSecureToken generates hex string with correct entropy length", () => {
  const token = generateSecureToken(32);
  assert.equal(typeof token, "string");
  assert.equal(token.length, 64); // 32 bytes = 64 hex characters
  assert.match(token, /^[0-9a-f]{64}$/);

  const token2 = generateSecureToken(32);
  assert.notEqual(token, token2);
});

test("hashToken generates consistent SHA-256 hex digest", () => {
  const token = "fixed-token-value-1234567890";
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test("constantTimeCompare correctly compares matching and non-matching strings safely", () => {
  const strA = hashToken("token-a");
  const strB = hashToken("token-a");
  const strC = hashToken("token-b");

  assert.equal(constantTimeCompare(strA, strB), true);
  assert.equal(constantTimeCompare(strA, strC), false);
  assert.equal(constantTimeCompare(strA, "different-length"), false);
});
