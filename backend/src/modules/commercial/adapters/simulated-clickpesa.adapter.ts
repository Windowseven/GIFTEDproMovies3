import {
  type CheckoutInitiationRequest,
  type CheckoutInitiationResult,
  type PaymentGatewayPort,
  type ProviderTransactionStatus,
  type TransactionStatusQueryResult,
} from "../ports/payment-gateway.port.js";

export interface SimulatedBehaviorOptions {
  defaultStatus?: ProviderTransactionStatus;
  simulateTimeout?: boolean;
  simulateUnavailable?: boolean;
}

export class SimulatedClickPesaAdapter implements PaymentGatewayPort {
  readonly providerName = "clickpesa";

  private readonly transactions = new Map<string, TransactionStatusQueryResult>();
  private readonly initiationCalls: CheckoutInitiationRequest[] = [];
  private behavior: SimulatedBehaviorOptions = {};

  constructor(options: SimulatedBehaviorOptions = {}) {
    this.behavior = { defaultStatus: "PENDING", ...options };
  }

  setBehavior(options: SimulatedBehaviorOptions): void {
    this.behavior = { ...this.behavior, ...options };
  }

  setTransactionStatus(
    orderReference: string,
    status: ProviderTransactionStatus,
    extra: Partial<TransactionStatusQueryResult> = {},
  ): void {
    this.transactions.set(orderReference, {
      providerReference: orderReference,
      status,
      providerEventId: extra.providerEventId ?? `SIM-EVT-${orderReference}`,
      amountTzs: extra.amountTzs,
      currency: extra.currency ?? "TZS",
      rawStatus: status,
      ...extra,
    });
  }

  async initiateCheckout(
    request: CheckoutInitiationRequest,
  ): Promise<CheckoutInitiationResult> {
    if (this.behavior.simulateTimeout) {
      throw new Error("Simulated ClickPesa checkout initiation timed out");
    }

    if (this.behavior.simulateUnavailable) {
      throw new Error("Simulated ClickPesa service unavailable (HTTP 503)");
    }

    // Reference validation per specification
    if (!request.orderReference || request.orderReference.length > 20) {
      throw new Error(
        `ClickPesa orderReference exceeds 20 characters: '${request.orderReference}'`,
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(request.orderReference)) {
      throw new Error(
        `ClickPesa orderReference is non-alphanumeric: '${request.orderReference}'`,
      );
    }

    this.initiationCalls.push({ ...request });

    const status = this.behavior.defaultStatus ?? "PENDING";
    if (!this.transactions.has(request.orderReference)) {
      this.transactions.set(request.orderReference, {
        providerReference: request.orderReference,
        providerEventId: `SIM-EVT-${request.orderReference}`,
        status,
        amountTzs: request.amountTzs,
        currency: "TZS",
        rawStatus: status,
      });
    }

    return {
      paymentMode: "HOSTED_CHECKOUT",
      checkoutUrl: `https://checkout.simulated-clickpesa.local/pay/${request.orderReference}`,
      providerReference: request.orderReference,
    };
  }

  async queryTransactionStatus(
    providerReference: string,
  ): Promise<TransactionStatusQueryResult> {
    if (this.behavior.simulateTimeout) {
      throw new Error("Simulated ClickPesa query timed out");
    }

    if (this.behavior.simulateUnavailable) {
      throw new Error("Simulated ClickPesa service unavailable (HTTP 503)");
    }

    const found = this.transactions.get(providerReference);
    if (!found) {
      return {
        providerReference,
        status: "NOT_FOUND",
        rawStatus: "NOT_FOUND",
      };
    }

    return { ...found };
  }

  getInitiationCalls(): readonly CheckoutInitiationRequest[] {
    return [...this.initiationCalls];
  }

  reset(): void {
    this.transactions.clear();
    this.initiationCalls.length = 0;
    this.behavior = { defaultStatus: "PENDING" };
  }
}
