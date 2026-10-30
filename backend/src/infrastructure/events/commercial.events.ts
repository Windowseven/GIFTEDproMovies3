import type { DomainEvent } from "./domain-event.base.js";

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  offerId: string;
  amountTzs: number;
  createdAt: Date;
}

export class OrderCreatedEvent implements DomainEvent {
  readonly eventName = "order.created";
  readonly occurredAt: Date;

  constructor(public readonly payload: OrderCreatedPayload) {
    this.occurredAt = new Date();
  }
}

export interface PaymentSettledPayload {
  paymentAttemptId: string;
  orderId: string;
  customerId: string;
  provider: string;
  amountTzs: number;
  settledAt: Date;
}

export class PaymentSettledEvent implements DomainEvent {
  readonly eventName = "payment.settled";
  readonly occurredAt: Date;

  constructor(public readonly payload: PaymentSettledPayload) {
    this.occurredAt = new Date();
  }
}

export interface EntitlementGrantedPayload {
  entitlementId: string;
  customerId: string;
  orderId: string;
  targetKind: string;
  grantedAt: Date;
}

export class EntitlementGrantedEvent implements DomainEvent {
  readonly eventName = "entitlement.granted";
  readonly occurredAt: Date;

  constructor(public readonly payload: EntitlementGrantedPayload) {
    this.occurredAt = new Date();
  }
}
