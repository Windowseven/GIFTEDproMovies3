import test from "node:test";
import assert from "node:assert/strict";
import { ClickPesaTokenManager } from "../src/modules/commercial/adapters/clickpesa-token.manager.js";
import { ClickPesaPaymentAdapter } from "../src/modules/commercial/adapters/clickpesa.adapter.js";
import { SimulatedClickPesaAdapter } from "../src/modules/commercial/adapters/simulated-clickpesa.adapter.js";
import type { CheckoutInitiationRequest } from "../src/modules/commercial/ports/payment-gateway.port.js";

test("Task 5.A1 — ClickPesa Gateway Port, Token Manager and Simulator Unit Suite", async (t) => {
  await t.test("ClickPesaTokenManager: retrieves and normalizes Bearer token", async () => {
    let fetchCount = 0;
    const mockFetch = (async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          token: "Bearer test-jwt-token-12345",
        }),
      } as Response;
    }) as typeof fetch;

    const manager = new ClickPesaTokenManager({
      clientId: "test-client-id",
      apiKey: "test-api-key",
      fetchFn: mockFetch,
    });

    const token = await manager.getBearerToken();
    assert.equal(token, "Bearer test-jwt-token-12345");
    assert.equal(fetchCount, 1);

    // Second call reuses cached token
    const cached = await manager.getBearerToken();
    assert.equal(cached, "Bearer test-jwt-token-12345");
    assert.equal(fetchCount, 1, "Cached token must not trigger another fetch");
  });

  await t.test("ClickPesaTokenManager: normalizes token without pre-existing 'Bearer ' prefix", async () => {
    const mockFetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        token: "raw-token-without-prefix",
      }),
    })) as unknown as typeof fetch;

    const manager = new ClickPesaTokenManager({
      clientId: "client",
      apiKey: "key",
      fetchFn: mockFetch,
    });

    const token = await manager.getBearerToken();
    assert.equal(token, "Bearer raw-token-without-prefix");
  });

  await t.test("ClickPesaTokenManager: single-flight mutex shares in-flight request across 10 concurrent callers", async () => {
    let networkCalls = 0;
    const mockFetch = (async () => {
      networkCalls++;
      // Simulate network latency of 30ms
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: `token-call-${networkCalls}`,
        }),
      } as Response;
    }) as typeof fetch;

    const manager = new ClickPesaTokenManager({
      clientId: "client",
      apiKey: "key",
      fetchFn: mockFetch,
    });

    // Fire 10 concurrent requests simultaneously
    const results = await Promise.all(
      Array.from({ length: 10 }, () => manager.getBearerToken()),
    );

    assert.equal(networkCalls, 1, "10 concurrent callers must trigger exactly 1 network call");
    for (const res of results) {
      assert.equal(res, "Bearer token-call-1");
    }
  });

  await t.test("ClickPesaTokenManager: handles token refresh failure without leaking secrets", async () => {
    const mockFetch = (async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized client_id or api_key secret-123",
    })) as unknown as typeof fetch;

    const manager = new ClickPesaTokenManager({
      clientId: "client",
      apiKey: "secret-123",
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => manager.getBearerToken(),
      (err: Error) => {
        assert.match(err.message, /failed with HTTP status 401/);
        return true;
      },
    );

    // Cache should remain empty after failure
    assert.equal(manager.getCacheState().hasCachedToken, false);
  });

  await t.test("ClickPesaPaymentAdapter: enforces reference length and character constraints", async () => {
    const dummyTokenManager = {
      getBearerToken: async () => "Bearer valid-token",
    } as ClickPesaTokenManager;

    const adapter = new ClickPesaPaymentAdapter(dummyTokenManager);

    const baseRequest: CheckoutInitiationRequest = {
      orderId: "order-1",
      attemptId: "att-1",
      orderReference: "CP-123456789012345678901", // 23 chars! (exceeds 20)
      amountTzs: 10000,
      currency: "TZS",
    };

    // 1. Rejects reference exceeding 20 chars
    await assert.rejects(
      async () => adapter.initiateCheckout(baseRequest),
      /orderReference must be between 1 and 20 characters/,
    );

    // 2. Rejects invalid characters
    await assert.rejects(
      async () =>
        adapter.initiateCheckout({
          ...baseRequest,
          orderReference: "CP 123!@#$",
        }),
      /orderReference must be alphanumeric/,
    );

    // 3. Rejects non-TZS currency
    await assert.rejects(
      async () =>
        adapter.initiateCheckout({
          ...baseRequest,
          orderReference: "CP12345",
          currency: "USD" as unknown as "TZS",
        }),
      /only supports TZS currency/,
    );

    // 4. Rejects negative or fractional amount
    await assert.rejects(
      async () =>
        adapter.initiateCheckout({
          ...baseRequest,
          orderReference: "CP12345",
          amountTzs: 0,
        }),
      /requires a positive integer TZS amount/,
    );
  });

  await t.test("ClickPesaPaymentAdapter: initiates checkout with valid payload", async () => {
    let capturedBody: string | undefined;
    let capturedHeaders: Record<string, unknown> | undefined;

    const mockFetch = (async (_url: unknown, init?: RequestInit) => {
      capturedBody = init?.body as string;
      capturedHeaders = init?.headers as Record<string, unknown> | undefined;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          checkoutUrl: "https://checkout.clickpesa.com/pay/CP12345678",
        }),
      } as Response;
    }) as typeof fetch;

    const tokenManager = {
      getBearerToken: async () => "Bearer cp-token-abc",
    } as ClickPesaTokenManager;

    const adapter = new ClickPesaPaymentAdapter(tokenManager, { fetchFn: mockFetch });

    const result = await adapter.initiateCheckout({
      orderId: "ord-1",
      attemptId: "att-1",
      orderReference: "CP12345678",
      amountTzs: 5000,
      currency: "TZS",
      callbackUrl: "https://giftedpromovies.com/checkout/callback",
    });

    assert.equal(result.checkoutUrl, "https://checkout.clickpesa.com/pay/CP12345678");
    assert.equal(result.providerReference, "CP12345678");

    const parsed = JSON.parse(capturedBody!);
    assert.equal(parsed.amount, "5000");
    assert.equal(parsed.currency, "TZS");
    assert.equal(parsed.orderReference, "CP12345678");
    assert.equal(parsed.callbackUrl, "https://giftedpromovies.com/checkout/callback");
    assert.equal((capturedHeaders as Record<string, string>)?.Authorization, "Bearer cp-token-abc");
  });

  await t.test("ClickPesaPaymentAdapter: queries transaction status and normalizes statuses", async () => {
    const statuses = [
      { raw: "SUCCESS", expected: "SUCCESS" },
      { raw: "SETTLED", expected: "SETTLED" },
      { raw: "PROCESSING", expected: "PROCESSING" },
      { raw: "PENDING", expected: "PENDING" },
      { raw: "FAILED", expected: "FAILED" },
      { raw: "ON-HOLD", expected: "ON_HOLD" },
      { raw: "REFUNDED", expected: "REFUNDED" },
      { raw: "REVERSED", expected: "REVERSED" },
      { raw: "SOME_UNMAPPED", expected: "UNKNOWN" },
    ];

    for (const { raw, expected } of statuses) {
      const mockFetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          id: "EVT-999",
          status: raw,
          orderReference: "CP1001",
          collectedAmount: "5000",
          collectedCurrency: "TZS",
        }),
      })) as unknown as typeof fetch;

      const tokenManager = {
        getBearerToken: async () => "Bearer valid",
      } as ClickPesaTokenManager;

      const adapter = new ClickPesaPaymentAdapter(tokenManager, { fetchFn: mockFetch });
      const queryResult = await adapter.queryTransactionStatus("CP1001");

      assert.equal(queryResult.status, expected);
      assert.equal(queryResult.providerReference, "CP1001");
      assert.equal(queryResult.providerEventId, "EVT-999");
      assert.equal(queryResult.amountTzs, 5000);
      assert.equal(queryResult.currency, "TZS");
    }
  });

  await t.test("ClickPesaPaymentAdapter: handles 404 as NOT_FOUND", async () => {
    const mockFetch = (async () => ({
      ok: false,
      status: 404,
      text: async () => "Transaction not found",
    })) as unknown as typeof fetch;

    const tokenManager = {
      getBearerToken: async () => "Bearer valid",
    } as ClickPesaTokenManager;

    const adapter = new ClickPesaPaymentAdapter(tokenManager, { fetchFn: mockFetch });
    const queryResult = await adapter.queryTransactionStatus("CP_NONEXISTENT");

    assert.equal(queryResult.status, "NOT_FOUND");
    assert.equal(queryResult.providerReference, "CP_NONEXISTENT");
  });

  await t.test("SimulatedClickPesaAdapter: deterministic offline lifecycle", async () => {
    const simulator = new SimulatedClickPesaAdapter();

    // 1. Initiate checkout
    const initResult = await simulator.initiateCheckout({
      orderId: "ord-sim-1",
      attemptId: "att-sim-1",
      orderReference: "CP_SIM_001",
      amountTzs: 15000,
      currency: "TZS",
    });

    assert.ok(initResult.checkoutUrl);
    assert.match(initResult.checkoutUrl, /checkout\.simulated-clickpesa\.local/);
    assert.equal(initResult.providerReference, "CP_SIM_001");

    // Default status is PENDING
    const pendingQuery = await simulator.queryTransactionStatus("CP_SIM_001");
    assert.equal(pendingQuery.status, "PENDING");
    assert.equal(pendingQuery.amountTzs, 15000);

    // 2. Preset status to SUCCESS
    simulator.setTransactionStatus("CP_SIM_001", "SUCCESS", {
      providerEventId: "EVT-SIM-SUCCESS-1",
      amountTzs: 15000,
    });

    const successQuery = await simulator.queryTransactionStatus("CP_SIM_001");
    assert.equal(successQuery.status, "SUCCESS");
    assert.equal(successQuery.providerEventId, "EVT-SIM-SUCCESS-1");

    // 3. Nonexistent returns NOT_FOUND
    const notFound = await simulator.queryTransactionStatus("CP_UNKNOWN");
    assert.equal(notFound.status, "NOT_FOUND");

    // 4. Test timeout simulation
    simulator.setBehavior({ simulateTimeout: true });
    await assert.rejects(
      async () => simulator.queryTransactionStatus("CP_SIM_001"),
      /timed out/,
    );
    await assert.rejects(
      async () =>
        simulator.initiateCheckout({
          orderId: "o",
          attemptId: "a",
          orderReference: "CP_TEST",
          amountTzs: 1000,
          currency: "TZS",
        }),
      /timed out/,
    );

    // 5. Test 503 unavailable simulation
    simulator.setBehavior({ simulateTimeout: false, simulateUnavailable: true });
    await assert.rejects(
      async () => simulator.queryTransactionStatus("CP_SIM_001"),
      /unavailable/,
    );

    // 6. Reset
    simulator.reset();
    const afterReset = await simulator.queryTransactionStatus("CP_SIM_001");
    assert.equal(afterReset.status, "NOT_FOUND");
  });
});
