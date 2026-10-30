import test from "node:test";
import assert from "node:assert/strict";
import {
  PalmPesaPaymentAdapter,
  normalizeTanzanianPhone,
} from "../src/modules/commercial/adapters/palmpesa.adapter.js";
import { SimulatedPalmPesaAdapter } from "../src/modules/commercial/adapters/simulated-palmpesa.adapter.js";
import type { CheckoutInitiationRequest } from "../src/modules/commercial/ports/payment-gateway.port.js";

test("PalmPesa Gateway Port, Adapter & Simulator Unit Suite", async (t) => {
  await t.test("normalizeTanzanianPhone: handles various Tanzanian phone representations", () => {
    assert.equal(normalizeTanzanianPhone("0712345678"), "255712345678");
    assert.equal(normalizeTanzanianPhone("712345678"), "255712345678");
    assert.equal(normalizeTanzanianPhone("+255 712 345 678"), "255712345678");
    assert.equal(normalizeTanzanianPhone("255712345678"), "255712345678");
    assert.equal(normalizeTanzanianPhone("0682000111"), "255682000111");
    assert.equal(normalizeTanzanianPhone("682000111"), "255682000111");
    assert.equal(normalizeTanzanianPhone("+255 (0) 754 112 233"), "255754112233");
  });

  await t.test("PalmPesaPaymentAdapter: constructor validation", () => {
    assert.throws(
      () => new PalmPesaPaymentAdapter({ apiToken: "" }),
      /requires a non-empty apiToken/,
    );
    assert.throws(
      () => new PalmPesaPaymentAdapter({ apiToken: "   " }),
      /requires a non-empty apiToken/,
    );
  });

  await t.test("PalmPesaPaymentAdapter: request validation constraints", async () => {
    const adapter = new PalmPesaPaymentAdapter({ apiToken: "test-token-123" });

    const baseRequest: CheckoutInitiationRequest = {
      orderId: "ord_101",
      attemptId: "att_101",
      orderReference: "PP101",
      amountTzs: 5000,
      currency: "TZS",
      customerPhone: "0712345678",
    };

    // 1. Non-TZS currency rejected
    await assert.rejects(
      async () => adapter.initiateCheckout({ ...baseRequest, currency: "USD" as "TZS" }),
      /only supports TZS currency/,
    );

    // 2. Amount < 100 rejected
    await assert.rejects(
      async () => adapter.initiateCheckout({ ...baseRequest, amountTzs: 50 }),
      /requires whole integer TZS between 100 and 100,000,000/,
    );

    // 3. Amount non-integer rejected
    await assert.rejects(
      async () => adapter.initiateCheckout({ ...baseRequest, amountTzs: 500.5 }),
      /requires whole integer TZS between 100 and 100,000,000/,
    );

    // 4. Missing phone rejected
    await assert.rejects(
      async () => adapter.initiateCheckout({ ...baseRequest, customerPhone: undefined }),
      /requires a customer phone number/,
    );

    // 5. Invalid Tanzanian phone format rejected
    await assert.rejects(
      async () => adapter.initiateCheckout({ ...baseRequest, customerPhone: "12345" }),
      /could not be normalized to valid Tanzania format/,
    );
  });

  await t.test("PalmPesaPaymentAdapter: initiates payment and handles 202 Accepted", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers || {};
      capturedBody = JSON.parse(init?.body || "{}");
      return {
        status: 202,
        ok: true,
        text: async () =>
          JSON.stringify({
            success: true,
            message: "Payment request accepted.",
            data: {
              order_id: "PALMPESAV2A17478082001",
              status: "INITIATING",
              status_url: "https://palmpesa.co.tz/api/v2/async/payments/PALMPESAV2A17478082001",
            },
          }),
      } as any;
    }) as typeof fetch;

    try {
      const adapter = new PalmPesaPaymentAdapter({
        apiToken: "secret-token-xyz",
        baseUrl: "https://palmpesa.co.tz",
      });

      const res = await adapter.initiateCheckout({
        orderId: "ord_202",
        attemptId: "att_202",
        orderReference: "PP20261022002",
        amountTzs: 15000,
        currency: "TZS",
        customerPhone: "0754112233",
        customerName: "Amina Juma",
        customerEmail: "amina@example.com",
        callbackUrl: "https://giftedpro.tz/api/v1/commercial/webhooks/palmpesa",
      });

      assert.equal(res.paymentMode, "ASYNC_PROMPT");
      assert.equal(res.providerReference, "PP20261022002");
      assert.equal(res.providerOrderId, "PALMPESAV2A17478082001");
      assert.equal(res.statusUrl, "https://palmpesa.co.tz/api/v2/async/payments/PALMPESAV2A17478082001");

      assert.equal(capturedUrl, "https://palmpesa.co.tz/api/v2/async/payments");
      assert.equal(capturedHeaders.Authorization, "Bearer secret-token-xyz");
      assert.equal(capturedBody.transaction_id, "PP20261022002");
      assert.equal(capturedBody.amount, 15000);
      assert.equal(capturedBody.currency, "TZS");
      assert.equal(capturedBody.phone, "255754112233");
      assert.equal(capturedBody.name, "Amina Juma");
      assert.equal(capturedBody.email, "amina@example.com");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("PalmPesaPaymentAdapter: handles 409 conflict and 401 unauthorized", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // 409 conflict
      globalThis.fetch = (async () => ({
        status: 409,
        ok: false,
        text: async () => JSON.stringify({ success: false, message: "transaction_id already used" }),
      })) as any;

      const adapter = new PalmPesaPaymentAdapter({ apiToken: "token" });
      await assert.rejects(
        async () =>
          adapter.initiateCheckout({
            orderId: "o",
            attemptId: "a",
            orderReference: "PP1",
            amountTzs: 1000,
            currency: "TZS",
            customerPhone: "0712345678",
          }),
        /PalmPesa conflict \(409\)/,
      );

      // 401 unauthorized
      globalThis.fetch = (async () => ({
        status: 401,
        ok: false,
        text: async () => JSON.stringify({ success: false, error: "Invalid API token" }),
      })) as any;

      await assert.rejects(
        async () =>
          adapter.initiateCheckout({
            orderId: "o",
            attemptId: "a",
            orderReference: "PP1",
            amountTzs: 1000,
            currency: "TZS",
            customerPhone: "0712345678",
          }),
        /PalmPesa authentication failed \(HTTP 401\)/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("PalmPesaPaymentAdapter: status query normalizes provider statuses", async () => {
    const originalFetch = globalThis.fetch;
    const adapter = new PalmPesaPaymentAdapter({ apiToken: "token" });

    const statusMap = [
      { raw: "COMPLETED", expected: "SUCCESS" },
      { raw: "INITIATING", expected: "PENDING" },
      { raw: "PENDING", expected: "PENDING" },
      { raw: "AMBIGUOUS", expected: "PENDING" },
      { raw: "CANCELLED", expected: "FAILED" },
      { raw: "REJECTED", expected: "FAILED" },
      { raw: "INITIATION_FAILED", expected: "FAILED" },
      { raw: "EXPIRED", expected: "FAILED" },
      { raw: "SOMETHING_NEW", expected: "UNKNOWN" },
    ];

    try {
      for (const { raw, expected } of statusMap) {
        globalThis.fetch = (async () => ({
          status: 200,
          ok: true,
          text: async () =>
            JSON.stringify({
              success: true,
              data: {
                order_id: "ORD_X",
                transaction_id: "TX_X",
                status: raw,
                amount: 5000,
                currency: "TZS",
              },
            }),
        })) as any;

        const res = await adapter.queryTransactionStatus("ORD_X");
        assert.equal(res.status, expected);
        assert.equal(res.providerEventId, "ORD_X");
        assert.equal(res.providerReference, "TX_X");
        assert.equal(res.amountTzs, 5000);
        assert.equal(res.currency, "TZS");
      }

      // 404 yields NOT_FOUND
      globalThis.fetch = (async () => ({
        status: 404,
        ok: false,
        text: async () => "Not Found",
      })) as any;

      const notFoundRes = await adapter.queryTransactionStatus("UNKNOWN_ORDER");
      assert.equal(notFoundRes.status, "NOT_FOUND");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("SimulatedPalmPesaAdapter: deterministic offline lifecycle", async () => {
    const simulator = new SimulatedPalmPesaAdapter();

    // 1. Initiate checkout
    const initRes = await simulator.initiateCheckout({
      orderId: "ord_sim_1",
      attemptId: "att_sim_1",
      orderReference: "PPSIM001",
      amountTzs: 12000,
      currency: "TZS",
      customerPhone: "0754112233",
    });

    assert.equal(initRes.paymentMode, "ASYNC_PROMPT");
    assert.equal(initRes.providerReference, "PPSIM001");
    assert.match(initRes.providerOrderId!, /^PALMPESAV2A/);
    assert.match(initRes.statusUrl!, /https:\/\/palmpesa\.co\.tz\/api\/v2\/async\/payments\//);

    // Initial status is PENDING
    const initialQuery = await simulator.queryTransactionStatus("PPSIM001");
    assert.equal(initialQuery.status, "PENDING");
    assert.equal(initialQuery.amountTzs, 12000);
    assert.equal(initialQuery.currency, "TZS");

    // Idempotent retry with same details returns same record
    const retryRes = await simulator.initiateCheckout({
      orderId: "ord_sim_1",
      attemptId: "att_sim_1",
      orderReference: "PPSIM001",
      amountTzs: 12000,
      currency: "TZS",
      customerPhone: "0754112233",
    });
    assert.equal(retryRes.providerOrderId, initRes.providerOrderId);

    // Conflict retry with different amount throws 409
    await assert.rejects(
      async () =>
        simulator.initiateCheckout({
          orderId: "ord_sim_1",
          attemptId: "att_sim_1",
          orderReference: "PPSIM001",
          amountTzs: 99999, // different
          currency: "TZS",
          customerPhone: "0754112233",
        }),
      /PalmPesa conflict \(409\)/,
    );

    // Transition status to COMPLETED
    simulator.transitionPaymentStatus("PPSIM001", "COMPLETED", "SELC_12345");
    const settledQuery = await simulator.queryTransactionStatus(initRes.providerOrderId!);
    assert.equal(settledQuery.status, "SUCCESS");
    assert.equal(settledQuery.rawStatus, "COMPLETED");

    // Query non-existent
    const missing = await simulator.queryTransactionStatus("DOES_NOT_EXIST");
    assert.equal(missing.status, "NOT_FOUND");

    // Simulation flags: timeout
    simulator.setBehavior({ simulateTimeout: true });
    await assert.rejects(
      async () => simulator.queryTransactionStatus("PPSIM001"),
      /timed out/,
    );
    await assert.rejects(
      async () =>
        simulator.initiateCheckout({
          orderId: "o",
          attemptId: "a",
          orderReference: "PP99",
          amountTzs: 1000,
          currency: "TZS",
          customerPhone: "0712345678",
        }),
      /timed out/,
    );

    // Simulation flags: unavailable
    simulator.setBehavior({ simulateTimeout: false, simulateUnavailable: true });
    await assert.rejects(
      async () =>
        simulator.initiateCheckout({
          orderId: "o",
          attemptId: "a",
          orderReference: "PP99",
          amountTzs: 1000,
          currency: "TZS",
          customerPhone: "0712345678",
        }),
      /service unavailable/,
    );
  });
});
