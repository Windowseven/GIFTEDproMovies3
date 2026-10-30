import type {
  CheckoutInitiationRequest,
  CheckoutInitiationResult,
  PaymentGatewayPort,
  ProviderTransactionStatus,
  TransactionStatusQueryResult,
} from "../ports/payment-gateway.port.js";

export interface PalmPesaAdapterOptions {
  apiToken: string;
  baseUrl?: string;
  requestTimeoutMs?: number;
}

interface PalmPesaAsyncPaymentResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    order_id?: string;
    status?: string;
    status_url?: string;
    created_at?: string;
  };
}

interface PalmPesaStatusQueryResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    order_id?: string;
    transaction_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    phone?: string;
    channel?: string;
    processed_at?: string;
  };
}

/**
 * Normalizes Tanzanian mobile money phone number to standard 255XXXXXXXXX format.
 * Accepted formats: 0712345678, 712345678, +255 712 345 678, 255712345678.
 */
export function normalizeTanzanianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("2550") && digits.length === 13) {
    return `255${digits.slice(4)}`;
  }
  if (digits.startsWith("255") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `255${digits.slice(1)}`;
  }
  if ((digits.startsWith("7") || digits.startsWith("6")) && digits.length === 9) {
    return `255${digits}`;
  }
  // Return digits as fallback if already normalized or non-standard
  return digits;
}

export class PalmPesaPaymentAdapter implements PaymentGatewayPort {
  readonly providerName = "palmpesa";
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(options: PalmPesaAdapterOptions) {
    if (!options.apiToken || options.apiToken.trim() === "") {
      throw new Error("PalmPesa adapter requires a non-empty apiToken");
    }
    this.apiToken = options.apiToken.trim();
    this.baseUrl = (options.baseUrl || "https://palmpesa.co.tz").replace(/\/+$/, "");
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  }

  async initiateCheckout(
    request: CheckoutInitiationRequest,
  ): Promise<CheckoutInitiationResult> {
    // 1. Validation
    if (request.currency !== "TZS") {
      throw new Error(
        `PalmPesa only supports TZS currency: received '${request.currency}'`,
      );
    }

    if (
      !request.amountTzs ||
      request.amountTzs < 100 ||
      request.amountTzs > 100_000_000 ||
      !Number.isInteger(request.amountTzs)
    ) {
      throw new Error(
        `PalmPesa requires whole integer TZS between 100 and 100,000,000: received '${request.amountTzs}'`,
      );
    }

    if (!request.customerPhone) {
      throw new Error("PalmPesa asynchronous mobile payment requires a customer phone number");
    }

    const normalizedPhone = normalizeTanzanianPhone(request.customerPhone);
    if (!/^255[67]\d{8}$/.test(normalizedPhone)) {
      throw new Error(
        `Customer phone number '${request.customerPhone}' could not be normalized to valid Tanzania format (255[67]XXXXXXXX)`,
      );
    }

    const customerName = request.customerName?.trim() || "GIFTEDpro Customer";
    const customerEmail = request.customerEmail?.trim() || "customer@giftedpro.local";

    const payload = {
      transaction_id: request.orderReference,
      amount: request.amountTzs,
      currency: "TZS",
      phone: normalizedPhone,
      name: customerName.slice(0, 255),
      email: customerEmail.slice(0, 255),
      callback_url: request.callbackUrl || `${this.baseUrl}/palmpesa/callback-placeholder`,
      buyer_remarks: `Order ${request.orderId}`.slice(0, 255),
      merchant_remarks: `Attempt ${request.attemptId}`.slice(0, 255),
    };

    const endpointUrl = `${this.baseUrl}/api/v2/async/payments`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let data: PalmPesaAsyncPaymentResponse = {};
      try {
        data = JSON.parse(responseText) as PalmPesaAsyncPaymentResponse;
      } catch {
        throw new Error(
          `PalmPesa returned invalid non-JSON response (HTTP ${response.status})`,
        );
      }

      if (response.status === 202 && data.success) {
        const orderData = data.data || {};
        return {
          paymentMode: "ASYNC_PROMPT",
          providerReference: request.orderReference,
          providerOrderId: orderData.order_id,
          statusUrl: orderData.status_url,
          checkoutUrl: orderData.status_url, // For compatibility
        };
      }

      if (response.status === 409) {
        throw new Error(
          `PalmPesa conflict (409): transaction_id already used with different details: ${data.message || ""}`,
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `PalmPesa authentication failed (HTTP ${response.status}): ${data.error || data.message || "Unauthorized"}`,
        );
      }

      throw new Error(
        `PalmPesa request payment failed (HTTP ${response.status}): ${data.message || data.error || responseText.slice(0, 200)}`,
      );
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        throw new Error(
          `PalmPesa payment initiation timed out after ${this.requestTimeoutMs}ms`,
          { cause: err },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async queryTransactionStatus(
    orderIdOrReference: string,
  ): Promise<TransactionStatusQueryResult> {
    const endpointUrl = `${this.baseUrl}/api/v2/async/payments/${encodeURIComponent(orderIdOrReference)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        return {
          providerReference: orderIdOrReference,
          status: "NOT_FOUND",
          rawStatus: "NOT_FOUND",
        };
      }

      const responseText = await response.text();
      let data: PalmPesaStatusQueryResponse = {};
      try {
        data = JSON.parse(responseText) as PalmPesaStatusQueryResponse;
      } catch {
        throw new Error(
          `PalmPesa status query returned invalid non-JSON response (HTTP ${response.status})`,
        );
      }

      if (response.ok && data.success && data.data) {
        const item = data.data;
        const normalized = this.mapStatus(item.status);
        return {
          providerEventId: item.order_id,
          providerReference: item.transaction_id || orderIdOrReference,
          status: normalized,
          amountTzs: typeof item.amount === "number" ? item.amount : undefined,
          currency: item.currency,
          rawStatus: item.status,
        };
      }

      throw new Error(
        `PalmPesa status query failed (HTTP ${response.status}): ${data.message || data.error || responseText.slice(0, 200)}`,
      );
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        throw new Error(
          `PalmPesa status query timed out after ${this.requestTimeoutMs}ms`,
          { cause: err },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapStatus(status: string | undefined): ProviderTransactionStatus {
    if (!status) return "UNKNOWN";
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
