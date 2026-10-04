import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeRedirectUrl } from "../src/modules/identity/utils/redirect-validator.js";

const FRONTEND_URL = "http://localhost:3000";
const ALLOWED_ORIGINS = ["http://localhost:3000", "https://staging.giftedpromovies.com"];

test("sanitizeRedirectUrl allows valid safe relative paths", () => {
  assert.equal(
    sanitizeRedirectUrl("/catalog", ALLOWED_ORIGINS, FRONTEND_URL),
    "http://localhost:3000/catalog",
  );
  assert.equal(
    sanitizeRedirectUrl("/movies/123?sort=desc", ALLOWED_ORIGINS, FRONTEND_URL),
    "http://localhost:3000/movies/123?sort=desc",
  );
  assert.equal(
    sanitizeRedirectUrl("/", ALLOWED_ORIGINS, FRONTEND_URL),
    "http://localhost:3000/",
  );
});

test("sanitizeRedirectUrl allows exact trusted absolute origins", () => {
  assert.equal(
    sanitizeRedirectUrl("http://localhost:3000/dashboard", ALLOWED_ORIGINS, FRONTEND_URL),
    "http://localhost:3000/dashboard",
  );
  assert.equal(
    sanitizeRedirectUrl(
      "https://staging.giftedpromovies.com/watch/abc",
      ALLOWED_ORIGINS,
      FRONTEND_URL,
    ),
    "https://staging.giftedpromovies.com/watch/abc",
  );
});

test("sanitizeRedirectUrl rejects open redirect attack payloads", () => {
  const attackPayloads = [
    "https://evil.com",
    "http://evil.com",
    "//evil.com",
    "//evil.com/path",
    "///evil.com",
    "/\\evil.com",
    "\\evil.com",
    "/foo\\bar",
    "javascript:alert(1)",
    "javascript:void(0)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "https://trusted.example@evil.com",
    "http://localhost:3000@evil.com",
    "https://evil.com?next=http://localhost:3000",
    "ftp://evil.com",
    "file:///etc/passwd",
    "  javascript:alert(1)  ",
    "/@evil.com",
  ];

  for (const attack of attackPayloads) {
    const result = sanitizeRedirectUrl(attack, ALLOWED_ORIGINS, FRONTEND_URL);
    assert.equal(
      result,
      FRONTEND_URL,
      `Payload "${attack}" should have been sanitized to ${FRONTEND_URL} but got "${result}"`,
    );
  }
});

test("sanitizeRedirectUrl falls back to frontendUrl for null, undefined, or empty values", () => {
  assert.equal(sanitizeRedirectUrl(null, ALLOWED_ORIGINS, FRONTEND_URL), FRONTEND_URL);
  assert.equal(sanitizeRedirectUrl(undefined, ALLOWED_ORIGINS, FRONTEND_URL), FRONTEND_URL);
  assert.equal(sanitizeRedirectUrl("", ALLOWED_ORIGINS, FRONTEND_URL), FRONTEND_URL);
  assert.equal(sanitizeRedirectUrl("   ", ALLOWED_ORIGINS, FRONTEND_URL), FRONTEND_URL);
});
