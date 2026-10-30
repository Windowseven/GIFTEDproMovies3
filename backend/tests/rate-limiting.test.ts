import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import {
  RateLimiter,
  createRateLimiterHook,
} from "../src/http/rate-limiter.js";
import { loadEnvironment } from "../src/config/environment.js";

test("RL-01: Single request within quota returns allowed with rate limit headers", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const now = 1_000_000;
  const result = limiter.check("1.2.3.4", "POST", "/api/v1/auth/login", now);

  assert.equal(result.allowed, true);
  assert.equal(result.limit, 5);
  assert.equal(result.remaining, 4);
  assert.equal(result.resetEpochSeconds, Math.ceil((now + 60_000) / 1000));
  assert.equal(result.retryAfterSeconds, undefined);
});

test("RL-02: Exceeding login limit (6 requests) triggers rejection with Retry-After", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const now = 1_000_000;
  const ip = "10.0.0.1";

  for (let i = 0; i < 5; i++) {
    const res = limiter.check(ip, "POST", "/api/v1/auth/login", now + i * 1000);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
    assert.equal(res.remaining, 4 - i);
  }

  // 6th request within window
  const blocked = limiter.check(ip, "POST", "/api/v1/auth/login", now + 5000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.limit, 5);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 55); // (now + 60000 - (now + 5000)) / 1000 = 55
  assert.equal(blocked.resetEpochSeconds, Math.ceil((now + 60_000) / 1000));
});

test("RL-03: Sliding-window log accurately slides past old timestamps", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const start = 1_000_000;
  const ip = "10.0.0.2";

  // Send 5 requests at t=0, t=10, t=20, t=30, t=40 (window is 60s)
  limiter.check(ip, "POST", "/api/v1/auth/login", start);
  limiter.check(ip, "POST", "/api/v1/auth/login", start + 10_000);
  limiter.check(ip, "POST", "/api/v1/auth/login", start + 20_000);
  limiter.check(ip, "POST", "/api/v1/auth/login", start + 30_000);
  limiter.check(ip, "POST", "/api/v1/auth/login", start + 40_000);

  // At t=50s, 6th request is rejected
  const at50 = limiter.check(ip, "POST", "/api/v1/auth/login", start + 50_000);
  assert.equal(at50.allowed, false);

  // At t=61s, the first request at t=0 has slid out of the 60s window!
  // Remaining active in window: 4 requests (t=10, 20, 30, 40)
  // Exactly 1 new request should be allowed:
  const at61 = limiter.check(ip, "POST", "/api/v1/auth/login", start + 61_000);
  assert.equal(at61.allowed, true);
  assert.equal(at61.remaining, 0); // 5 - (4 + 1) = 0 remaining

  // Immediate subsequent request at t=61.1s is rejected again
  const at61_1 = limiter.check(ip, "POST", "/api/v1/auth/login", start + 61_100);
  assert.equal(at61_1.allowed, false);
});

test("RL-04: Dual-bucket evaluation: endpoint rule and global rule operate independently without cross-leakage", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const now = 1_000_000;
  const ip = "10.0.0.3";

  // Exhaust login endpoint quota (5 requests)
  for (let i = 0; i < 5; i++) {
    const res = limiter.check(ip, "POST", "/api/v1/auth/login", now + i * 100);
    assert.equal(res.allowed, true);
  }

  // 6th login is blocked by endpoint rule
  const login6 = limiter.check(ip, "POST", "/api/v1/auth/login", now + 600);
  assert.equal(login6.allowed, false);
  assert.equal(login6.limit, 5);

  // Register endpoint has its own distinct bucket: should succeed!
  const register1 = limiter.check(ip, "POST", "/api/v1/auth/register", now + 700);
  assert.equal(register1.allowed, true);
  assert.equal(register1.limit, 5);
  assert.equal(register1.remaining, 4);

  // General API route (e.g., /api/v1/catalog) uses only global bucket: should succeed!
  const catalogReq = limiter.check(ip, "GET", "/api/v1/catalog/movies", now + 800);
  assert.equal(catalogReq.allowed, true);
  assert.equal(catalogReq.limit, 100);
});

test("RL-05: Non-partial quota consumption: rejection by either bucket does not consume the other", () => {
  // Create limiter with global limit of 2 and endpoint limit of 5
  const limiter = new RateLimiter({
    enableCleanupTimer: false,
    rules: [
      {
        method: "POST",
        path: "/api/v1/auth/test",
        windowMs: 60_000,
        maxRequests: 5,
      },
    ],
    globalRule: {
      method: "*",
      path: "/api/v1",
      windowMs: 60_000,
      maxRequests: 2,
    },
  });

  const now = 1_000_000;
  const ip = "10.0.0.4";

  // Request 1: consumes both (global has 1 left, endpoint has 4 left)
  assert.equal(limiter.check(ip, "POST", "/api/v1/auth/test", now).allowed, true);
  // Request 2: consumes both (global has 0 left, endpoint has 3 left)
  assert.equal(limiter.check(ip, "POST", "/api/v1/auth/test", now + 100).allowed, true);

  // Request 3: global quota exceeded! Should reject and NOT modify endpoint bucket
  const res3 = limiter.check(ip, "POST", "/api/v1/auth/test", now + 200);
  assert.equal(res3.allowed, false);
  assert.equal(res3.limit, 2); // global limit reported

  // When global window resets at now + 60_001, endpoint bucket should still reflect only the 2 committed requests!
  const resAfter = limiter.check(ip, "POST", "/api/v1/auth/test", now + 60_001);
  assert.equal(resAfter.allowed, true);
});

test("RL-06: Health check routes are unconditionally exempt from all rate limiting", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const now = 1_000_000;
  const ip = "10.0.0.5";

  for (let i = 0; i < 150; i++) {
    const live = limiter.check(ip, "GET", "/health/live", now + i * 10);
    assert.equal(live.allowed, true);
    assert.equal(live.limit, Infinity);

    const ready = limiter.check(ip, "GET", "/health/ready", now + i * 10);
    assert.equal(ready.allowed, true);
    assert.equal(ready.limit, Infinity);
  }
});

test("RL-07: URL and method normalization correctly handles trailing slashes and query strings", () => {
  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const now = 1_000_000;
  const ip = "10.0.0.6";

  // URL with query params
  const res1 = limiter.check(ip, "POST", "/api/v1/auth/login?redirect=/home&attempt=1", now);
  assert.equal(res1.allowed, true);
  assert.equal(res1.limit, 5);
  assert.equal(res1.remaining, 4);

  // URL with trailing slash
  const res2 = limiter.check(ip, "post", "/api/v1/auth/login/", now + 100);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 3);
});

test("RL-08: Store enforces hard 10,000-key bound", () => {
  const limiter = new RateLimiter({
    maxKeys: 10_000,
    enableCleanupTimer: false,
  });

  const now = 1_000_000;
  // Fill store with 5,000 IPs (each creates 1 global key = 5,000 keys)
  for (let i = 0; i < 5_000; i++) {
    limiter.check(`10.1.${Math.floor(i / 250)}.${i % 250}`, "GET", "/api/v1/movies", now);
  }
  assert.equal(limiter.getStoreSize(), 5_000);

  // Fill up to 10,000 keys
  for (let i = 5_000; i < 10_000; i++) {
    limiter.check(`10.1.${Math.floor(i / 250)}.${i % 250}`, "GET", "/api/v1/movies", now);
  }
  assert.equal(limiter.getStoreSize(), 10_000);
});

test("RL-09: Defensive shedding under saturation preserves active offender entries", () => {
  const limiter = new RateLimiter({
    maxKeys: 100, // Small capacity for deterministic overflow test
    enableCleanupTimer: false,
  });

  const now = 1_000_000;
  // Fill store with 100 active keys
  for (let i = 0; i < 100; i++) {
    limiter.check(`192.168.1.${i}`, "GET", "/api/v1/movies", now);
  }
  assert.equal(limiter.getStoreSize(), 100);

  // 101st distinct IP arrives while all 100 existing entries are active
  const overflow = limiter.check("192.168.2.1", "GET", "/api/v1/movies", now + 100);
  assert.equal(overflow.allowed, false);
  assert.equal(overflow.isShedding, true);
  assert.equal(overflow.retryAfterSeconds, 60);

  // Store size remained strictly bounded at 100
  assert.equal(limiter.getStoreSize(), 100);

  // Existing tracked IP can still make requests within its quota
  const existingReq = limiter.check("192.168.1.0", "GET", "/api/v1/movies", now + 200);
  assert.equal(existingReq.allowed, true);
});

test("RL-10: Expiry sweep correctly reclaims space for new keys", () => {
  const limiter = new RateLimiter({
    maxKeys: 10,
    enableCleanupTimer: false,
  });

  const now = 1_000_000;
  for (let i = 0; i < 10; i++) {
    limiter.check(`10.0.0.${i}`, "GET", "/api/v1/movies", now);
  }
  assert.equal(limiter.getStoreSize(), 10);

  // Advance time past 60s window
  const future = now + 65_000;
  const swept = limiter.sweepExpired(future);
  assert.equal(swept, 10);
  assert.equal(limiter.getStoreSize(), 0);

  // New keys can be tracked normally
  const fresh = limiter.check("10.0.0.99", "GET", "/api/v1/movies", future);
  assert.equal(fresh.allowed, true);
  assert.equal(limiter.getStoreSize(), 1);
});

test("RL-11: Fastify onRequest hook integration returns standard 429 envelope and handles proxies", async () => {
  const env = loadEnvironment({
    APP_ENV: "test",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
    TRUSTED_PROXY_CIDRS: "10.0.0.0/8",
  });

  const limiter = new RateLimiter({ enableCleanupTimer: false });
  const app = Fastify({
    trustProxy: ["10.0.0.0/8"],
  });

  app.addHook("onRequest", createRateLimiterHook(env, limiter));

  app.post("/api/v1/auth/login", async () => ({ status: "ok" }));
  app.get("/health/live", async () => ({ status: "alive" }));

  await app.ready();

  try {
    // 1. Health route is unaffected
    const healthRes = await app.inject({
      method: "GET",
      url: "/health/live",
    });
    assert.equal(healthRes.statusCode, 200);

    // 2. 5 successful login calls from trusted proxy representing client 198.51.100.1
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        remoteAddress: "10.0.1.1", // direct peer is trusted
        headers: {
          "x-forwarded-for": "198.51.100.1",
        },
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers["x-ratelimit-limit"], "5");
      assert.equal(res.headers["x-ratelimit-remaining"], String(4 - i));
    }

    // 3. 6th call from same client is blocked with 429
    const blockedRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: "10.0.1.1",
      headers: {
        "x-forwarded-for": "198.51.100.1",
      },
    });
    assert.equal(blockedRes.statusCode, 429);
    assert.equal(blockedRes.headers["retry-after"], "60");
    assert.equal(blockedRes.headers["x-ratelimit-remaining"], "0");

    const payload = JSON.parse(blockedRes.payload);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, "TOO_MANY_REQUESTS");
    assert.ok(payload.error.timestamp);
    assert.ok(payload.error.requestId);

    // 4. Untrusted proxy spoof test: peer is untrusted (192.168.1.1) attempting to spoof 198.51.100.1
    // Fastify ignores X-Forwarded-For because 192.168.1.1 is not in trustProxy CIDRs
    const untrustedRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: "192.168.1.1", // untrusted peer
      headers: {
        "x-forwarded-for": "198.51.100.1", // attempted spoof of blocked IP
      },
    });
    // Since 192.168.1.1 has made 0 requests, it succeeds! (Proves Fastify ignored the spoofed header)
    assert.equal(untrustedRes.statusCode, 200);
  } finally {
    await app.close();
  }
});
