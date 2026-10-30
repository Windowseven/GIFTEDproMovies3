import assert from "node:assert/strict";
import test from "node:test";
import { EventBusService } from "../src/infrastructure/events/event-bus.service.js";
import {
  OrderCreatedEvent,
  PaymentSettledEvent,
  EntitlementGrantedEvent,
} from "../src/infrastructure/events/commercial.events.js";

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("In-process Asynchronous EventBus unit suite (GPM-AUDIT-005)", async (t) => {
  await t.test("EB-01: EventBus publishes and asynchronous subscriber receives event payload", async () => {
    const bus = new EventBusService();
    const received: any[] = [];

    bus.subscribe<OrderCreatedEvent>("order.created", (event) => {
      received.push(event.payload);
    });

    const payload = {
      orderId: "ord-123",
      customerId: "cust-456",
      offerId: "off-789",
      amountTzs: 10000,
      createdAt: new Date(),
    };

    bus.publish(new OrderCreatedEvent(payload));

    // Initially empty before tick
    assert.equal(received.length, 0);

    // Wait deterministically for subscriber to receive event
    await waitFor(() => received.length === 1);

    assert.equal(received.length, 1);
    assert.deepEqual(received[0], payload);

    bus.onModuleDestroy();
  });

  await t.test("EB-02: Listener errors are isolated and do not prevent other subscribers from executing", async () => {
    const bus = new EventBusService();
    const received: string[] = [];

    // Failing subscriber
    bus.subscribe<PaymentSettledEvent>("payment.settled", async () => {
      throw new Error("Simulated downstream subscriber failure");
    });

    // Successful subscriber
    bus.subscribe<PaymentSettledEvent>("payment.settled", (event) => {
      received.push(event.payload.paymentAttemptId);
    });

    const payload = {
      paymentAttemptId: "pay-attempt-1",
      orderId: "ord-1",
      customerId: "cust-1",
      provider: "CLICKPESA",
      amountTzs: 5000,
      settledAt: new Date(),
    };

    // Publishing should not throw
    assert.doesNotThrow(() => {
      bus.publish(new PaymentSettledEvent(payload));
    });

    await waitFor(() => received.length === 1);

    assert.equal(received.length, 1);
    assert.equal(received[0], "pay-attempt-1");

    bus.onModuleDestroy();
  });

  await t.test("EB-03: Multiple subscribers receive broadcast events concurrently", async () => {
    const bus = new EventBusService();
    let sub1Calls = 0;
    let sub2Calls = 0;

    bus.subscribe<EntitlementGrantedEvent>("entitlement.granted", () => {
      sub1Calls++;
    });

    bus.subscribe<EntitlementGrantedEvent>("entitlement.granted", () => {
      sub2Calls++;
    });

    const payload = {
      entitlementId: "ent-1",
      customerId: "cust-1",
      orderId: "ord-1",
      targetKind: "MOVIE",
      grantedAt: new Date(),
    };

    bus.publish(new EntitlementGrantedEvent(payload));

    await waitFor(() => sub1Calls === 1 && sub2Calls === 1);

    assert.equal(sub1Calls, 1);
    assert.equal(sub2Calls, 1);

    bus.onModuleDestroy();
  });

  await t.test("EB-04: Unsubscribe unregisters listener cleanly", async () => {
    const bus = new EventBusService();
    let callCount = 0;

    const unsubscribe = bus.subscribe<OrderCreatedEvent>("order.created", () => {
      callCount++;
    });

    bus.publish(
      new OrderCreatedEvent({
        orderId: "ord-1",
        customerId: "cust-1",
        offerId: "off-1",
        amountTzs: 5000,
        createdAt: new Date(),
      }),
    );

    await waitFor(() => callCount === 1);
    assert.equal(callCount, 1);

    unsubscribe();

    bus.publish(
      new OrderCreatedEvent({
        orderId: "ord-2",
        customerId: "cust-1",
        offerId: "off-1",
        amountTzs: 5000,
        createdAt: new Date(),
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(callCount, 1, "Unsubscribed listener should not be called again");

    bus.onModuleDestroy();
  });

  await t.test("EB-05: Typed commercial events instantiate with correct event names and timestamps", async () => {
    const orderEvt = new OrderCreatedEvent({
      orderId: "ord-1",
      customerId: "cust-1",
      offerId: "off-1",
      amountTzs: 2000,
      createdAt: new Date(),
    });
    assert.equal(orderEvt.eventName, "order.created");
    assert.ok(orderEvt.occurredAt instanceof Date);

    const paymentEvt = new PaymentSettledEvent({
      paymentAttemptId: "pay-1",
      orderId: "ord-1",
      customerId: "cust-1",
      provider: "PALMPESA",
      amountTzs: 2000,
      settledAt: new Date(),
    });
    assert.equal(paymentEvt.eventName, "payment.settled");
    assert.ok(paymentEvt.occurredAt instanceof Date);

    const entEvt = new EntitlementGrantedEvent({
      entitlementId: "ent-1",
      customerId: "cust-1",
      orderId: "ord-1",
      targetKind: "CATALOG",
      grantedAt: new Date(),
    });
    assert.equal(entEvt.eventName, "entitlement.granted");
    assert.ok(entEvt.occurredAt instanceof Date);
  });
});
