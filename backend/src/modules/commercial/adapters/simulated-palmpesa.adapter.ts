import { randomBytes } from "node:crypto";
import type {
  CheckoutInitiationRequest,
  CheckoutInitiationResult,
  PaymentGatewayPort,
  ProviderTransactionStatus,
  TransactionStatusQueryResult,
} from "../ports/payment-gateway.port.js";
import { normalizeTanzanianPhone } from "./palmpesa.adapter.js";

export interface SimulatedPalmPesaRecord {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  phone: string;
  status: string;
  selcomReference?: string;
  channel?: string;
  createdAt: string;
  updatedAt: string;
  statusUrl: string;
}

export interface SimulatedPalmPesaBehavior {
  simulateTimeout?: boolean;
  simulateUnavailable?: boolean;
  defaultInitialStatus?: "INITIATING" | "PENDING" | "COMPLETED";
}

export class SimulatedPalmPesaAdapter implements PaymentGatewayPort {
  readonly providerName = "palmpesa";
  private readonly records = new Map<string, SimulatedPalmPesaRecord>();
  private readonly orderIdIndex = new Map<string, string>(); // orderId -> transactionId
  private behavior: SimulatedPalmPesaBehavior;

  constructor(behavior: SimulatedPalmPesaBehavior = {}) {
    this.behavior = {
      defaultInitialStatus: "INITIATING",
      ...behavior,
    };
  }

  setBehavior(behavior: Partial<SimulatedPalmPesaBehavior>): void {
    this.behavior = { ...this.behavior, ...behavior };
  }

  async initiateCheckout(
    request: CheckoutInitiationRequest,
  ): Promise<CheckoutInitiationResult> {
    if (this.behavior.simulateTimeout) {
      throw new Error("Simulated PalmPesa checkout initiation timed out");
    }

    if (this.behavior.simulateUnavailable) {
      throw new Error("Simulated PalmPesa service unavailable (HTTP 503)");
    }

    if (request.currency !== "TZS") {
      throw new Error(`PalmPesa only supports TZS: received '${request.currency}'`);
    }

    if (
      !request.amountTzs ||
      request.amountTzs < 100 ||
      request.amountTzs > 100_000_000 ||
      !Number.isInteger(request.amountTzs)
    ) {
      throw new Error(`PalmPesa requires whole integer TZS amount: received '${request.amountTzs}'`);
    }

    if (!request.customerPhone) {
      throw new Error("PalmPesa asynchronous mobile payment requires a customer phone number");
    }

    const phone = normalizeTanzanianPhone(request.customerPhone);
    const txId = request.orderReference;

    // Check idempotency: Reusing transaction_id
    const existing = this.records.get(txId);
    if (existing) {
      if (existing.amount !== request.amountTzs || existing.phone !== phone) {
        throw new Error(
          "PalmPesa conflict (409): This transaction_id was already used with different payment details.",
        );
      }
      return {
        paymentMode: "ASYNC_PROMPT",
        providerReference: existing.transactionId,
        providerOrderId: existing.orderId,
        statusUrl: existing.statusUrl,
        checkoutUrl: existing.statusUrl,
      };
    }

    const orderId = `PALMPESAV2A${Date.now()}${randomBytes(4).toString("hex").toUpperCase()}`;
    const statusUrl = `https://palmpesa.co.tz/api/v2/async/payments/${orderId}`;
    const initialStatus = this.behavior.defaultInitialStatus || "INITIATING";

    const record: SimulatedPalmPesaRecord = {
      transactionId: txId,
      orderId,
      amount: request.amountTzs,
      currency: "TZS",
      phone,
      status: initialStatus,
      channel: "TIGOPESATZ",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusUrl,
    };

    this.records.set(txId, record);
    this.orderIdIndex.set(orderId, txId);

    return {
      paymentMode: "ASYNC_PROMPT",
      providerReference: txId,
      providerOrderId: orderId,
      statusUrl,
      checkoutUrl: statusUrl,
    };
  }

  async queryTransactionStatus(
    orderIdOrReference: string,
  ): Promise<TransactionStatusQueryResult> {
    if (this.behavior.simulateTimeout) {
      throw new Error("Simulated PalmPesa query timed out");
    }

    // Lookup by transaction_id or order_id
    let record = this.records.get(orderIdOrReference);
    if (!record) {
      const txId = this.orderIdIndex.get(orderIdOrReference);
      if (txId) {
        record = this.records.get(txId);
      }
    }

    if (!record) {
      return {
        providerReference: orderIdOrReference,
        status: "NOT_FOUND",
        rawStatus: "NOT_FOUND",
      };
    }

    const normalized = this.mapStatus(record.status);
    return {
      providerEventId: record.orderId,
      providerReference: record.transactionId,
      status: normalized,
      amountTzs: record.amount,
      currency: record.currency,
      rawStatus: record.status,
    };
  }

  setTransactionStatus(
    orderReference: string,
    status: ProviderTransactionStatus | string,
    extra: Partial<TransactionStatusQueryResult> = {},
  ): void {
    const rawStatus = (extra.rawStatus ?? status).toUpperCase();
    const orderId = extra.providerEventId ?? `PALMPESAV2A${Date.now()}`;
    const record: SimulatedPalmPesaRecord = {
      transactionId: orderReference,
      orderId,
      amount: extra.amountTzs ?? 5000,
      currency: extra.currency ?? "TZS",
      phone: "255712345678",
      status: rawStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusUrl: `https://palmpesa.co.tz/api/v2/async/payments/${orderId}`,
    };
    this.records.set(orderReference, record);
    this.orderIdIndex.set(orderId, orderReference);
  }

  reset(): void {
    this.records.clear();
    this.orderIdIndex.clear();
    this.behavior = { defaultInitialStatus: "INITIATING" };
  }

  transitionPaymentStatus(
    orderIdOrReference: string,
    newStatus: string,
    selcomReference?: string,
  ): SimulatedPalmPesaRecord {
    let record = this.records.get(orderIdOrReference);
    if (!record) {
      const txId = this.orderIdIndex.get(orderIdOrReference);
      if (txId) {
        record = this.records.get(txId);
      }
    }
    if (!record) {
      throw new Error(`Record not found: ${orderIdOrReference}`);
    }
    record.status = newStatus;
    if (selcomReference) {
      record.selcomReference = selcomReference;
    }
    record.updatedAt = new Date().toISOString();
    return record;
  }

  getRecord(orderIdOrReference: string): SimulatedPalmPesaRecord | undefined {
    let record = this.records.get(orderIdOrReference);
    if (!record) {
      const txId = this.orderIdIndex.get(orderIdOrReference);
      if (txId) {
        record = this.records.get(txId);
      }
    }
    return record;
  }

  private mapStatus(status: string): ProviderTransactionStatus {
    const upper = status.trim().toUpperCase();
    switch (upper) {
      case "COMPLETED":
      case "SUCCESS":
      case "SETTLED":
        return "SUCCESS";
      case "INITIATING":
      case "PENDING":
      case "AMBIGUOUS":
        return "PENDING";
      case "CANCELLED":
      case "REJECTED":
      case "INITIATION_FAILED":
      case "EXPIRED":
      case "FAILED":
        return "FAILED";
      default:
        return "UNKNOWN";
    }
  }
}
