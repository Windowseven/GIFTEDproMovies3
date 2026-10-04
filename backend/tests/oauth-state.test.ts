import assert from "node:assert/strict";
import test from "node:test";
import {
  generatePkcePair,
  parseAndVerifyOAuthState,
  serializeOAuthState,
  type OAuthStatePayload,
} from "../src/modules/identity/utils/oauth-state.js";

const SECRET = "super_secret_test_key_for_oauth_state";

test("generatePkcePair produces 43+ char verifier and valid S256 challenge", () => {
  const { codeVerifier, codeChallenge } = generatePkcePair();
  assert.ok(codeVerifier.length >= 43, "codeVerifier must be at least 43 characters");
  assert.ok(codeChallenge.length >= 43, "codeChallenge must be at least 43 characters");
  assert.notEqual(codeVerifier, codeChallenge);
});

test("serializeOAuthState and parseAndVerifyOAuthState roundtrip successfully", () => {
  const payload: OAuthStatePayload = {
    state: "valid_state_1234567890abcdef",
    codeVerifier: "valid_code_verifier_1234567890abcdef",
    nonce: "valid_nonce_1234567890abcdef",
    returnTo: "http://localhost:3000/catalog",
    createdAt: Date.now(),
  };

  const cookie = serializeOAuthState(payload, SECRET);
  assert.ok(cookie.includes("."), "Cookie must contain data.signature");

  const verified = parseAndVerifyOAuthState(cookie, payload.state, SECRET);
  assert.ok(verified, "State verification should succeed");
  assert.equal(verified?.state, payload.state);
  assert.equal(verified?.codeVerifier, payload.codeVerifier);
  assert.equal(verified?.nonce, payload.nonce);
  assert.equal(verified?.returnTo, payload.returnTo);
});

test("parseAndVerifyOAuthState rejects state mismatch", () => {
  const payload: OAuthStatePayload = {
    state: "correct_state",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: Date.now(),
  };
  const cookie = serializeOAuthState(payload, SECRET);

  const result = parseAndVerifyOAuthState(cookie, "attacker_state", SECRET);
  assert.equal(result, null, "Mismatching state must return null");
});

test("parseAndVerifyOAuthState rejects tampered payload or signature", () => {
  const payload: OAuthStatePayload = {
    state: "state_val",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: Date.now(),
  };
  const cookie = serializeOAuthState(payload, SECRET);
  const [data, sig] = cookie.split(".");

  // 1. Tampered data
  const tamperedData = Buffer.from(JSON.stringify({ ...payload, returnTo: "https://evil.com" })).toString("base64url");
  assert.equal(parseAndVerifyOAuthState(`${tamperedData}.${sig}`, payload.state, SECRET), null);

  // 2. Tampered signature
  assert.equal(parseAndVerifyOAuthState(`${data}.invalidsignature123`, payload.state, SECRET), null);

  // 3. Wrong secret
  assert.equal(parseAndVerifyOAuthState(cookie, payload.state, "different_secret"), null);
});

test("parseAndVerifyOAuthState rejects expired state cookie (>10 minutes)", () => {
  const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
  const payload: OAuthStatePayload = {
    state: "state_val",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: elevenMinutesAgo,
  };
  const cookie = serializeOAuthState(payload, SECRET);

  const result = parseAndVerifyOAuthState(cookie, payload.state, SECRET);
  assert.equal(result, null, "Expired state must be rejected");
});

test("parseAndVerifyOAuthState rejects malformed or empty inputs", () => {
  assert.equal(parseAndVerifyOAuthState(null, "state", SECRET), null);
  assert.equal(parseAndVerifyOAuthState(undefined, "state", SECRET), null);
  assert.equal(parseAndVerifyOAuthState("", "state", SECRET), null);
  assert.equal(parseAndVerifyOAuthState("invalid_cookie_without_dot", "state", SECRET), null);
  assert.equal(parseAndVerifyOAuthState(".only_dot", "state", SECRET), null);
});
