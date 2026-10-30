import {
  type CheckoutInitiationRequest,
  type CheckoutInitiationResult,
  type PaymentGatewayPort,
  type ProviderTransactionStatus,
  type TransactionStatusQueryResult,
} from "../ports/payment-gateway.port.js";
import { type ClickPesaTokenManager } from "./clickpesa-token.manager.js";

export interface ClickPesaAdapterConfig {
  baseUrl?: string;
  requestTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class ClickPesaPaymentAdapter implements PaymentGatewayPort {
  readonly providerName = "clickpesa";
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(
    private readonly tokenManager: ClickPesaTokenManager,
    config: ClickPesaAdapterConfig = {},
  ) {
    this.baseUrl = config.baseUrl ?? "https://api.clickpesa.com";
    this.requestTimeoutMs = config.requestTimeoutMs ?? 10_000;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  /**
   * Generates a ClickPesa hosted checkout URL for an order attempt.
   */
  async initiateCheckout(
    request: CheckoutInitiationRequest,
  ): Promise<CheckoutInitiationResult> {
    // 1. Reference length and format validation per ClickPesa mobile money spec
    if (!request.orderReference || request.orderReference.length > 20) {
      throw new Error(
        `ClickPesa orderReference must be between 1 and 20 characters: received '${request.orderReference}' (${request.orderReference?.length ?? 0} chars)`,
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(request.orderReference)) {
      throw new Error(
        `ClickPesa orderReference must be alphanumeric (hyphens/underscores allowed): received '${request.orderReference}'`,
      );
    }

    if (request.currency !== "TZS") {
      throw new Error(
        `ClickPesa only supports TZS currency for local mobile money: received '${request.currency}'`,
      );
    }

    if (!request.amountTzs || request.amountTzs <= 0 || !Number.isInteger(request.amountTzs)) {
      throw new Error(
        `ClickPesa requires a positive integer TZS amount: received '${request.amountTzs}'`,
      );
    }

    // 2. Obtain fresh or cached bearer token
    const token = await this.tokenManager.getBearerToken();

    // 3. Initiate checkout link call
    const endpointUrl = `${this.baseUrl}/third-parties/payments/generate-checkout-url`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const payload: Record<string, unknown> = {
        amount: request.amountTzs.toString(),
        currency: "TZS",
        orderReference: request.orderReference,
      };

      if (request.callbackUrl) {
        payload.callbackUrl = request.callbackUrl;
      }

      const response = await this.fetchFn(endpointUrl, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `ClickPesa checkout initiation failed with status ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        success?: boolean;
        url?: string;
        checkoutUrl?: string;
        paymentUrl?: string;
        data?: { url?: string; checkoutUrl?: string };
      };

      const checkoutUrl =
        data.checkoutUrl ??
        data.url ??
        data.paymentUrl ??
        data.data?.checkoutUrl ??
        data.data?.url;

      if (!checkoutUrl || typeof checkoutUrl !== "string") {
        throw new Error("ClickPesa checkout response missing checkout URL");
      }

      return {
        paymentMode: "HOSTED_CHECKOUT",
        checkoutUrl,
        providerReference: request.orderReference,
      };
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        throw new Error(
          `ClickPesa checkout initiation timed out after ${this.requestTimeoutMs}ms`,
          { cause: err },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Queries payment status from ClickPesa using our external orderReference.
   */
  async queryTransactionStatus(
    providerReference: string,
  ): Promise<TransactionStatusQueryResult> {
    if (!providerReference) {
      throw new Error("providerReference is required to query ClickPesa status");
    }

    const token = await this.tokenManager.getBearerToken();
    const endpointUrl = `${this.baseUrl}/third-parties/payments/${encodeURIComponent(providerReference)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchFn(endpointUrl, {
        method: "GET",
        headers: {
          Authorization: token,
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        return {
          providerReference,
          status: "NOT_FOUND",
          rawStatus: "NOT_FOUND",
        };
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `ClickPesa transaction query failed with status ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        id?: string;
        status?: string;
        orderReference?: string;
        collectedAmount?: string | number;
        collectedCurrency?: string;
        data?: {
          id?: string;
          status?: string;
          orderReference?: string;
          collectedAmount?: string | number;
          collectedCurrency?: string;
        };
      };

      const record = data.data ?? data;
      const rawStatus = (record.status ?? "UNKNOWN").toUpperCase();
      const status = this.mapClickPesaStatus(rawStatus);

      let parsedAmount: number | undefined;
      if (record.collectedAmount !== undefined && record.collectedAmount !== null) {
        parsedAmount = parseInt(String(record.collectedAmount), 10);
      }

      return {
        providerEventId: record.id,
        providerReference: record.orderReference ?? providerReference,
        status,
        amountTzs: parsedAmount,
        currency: record.collectedCurrency ?? "TZS",
        rawStatus,
      };
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        throw new Error(
          `ClickPesa transaction query timed out after ${this.requestTimeoutMs}ms`,
          { cause: err },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Authoritative normalization of ClickPesa transaction statuses to internal enum.
   */
  private mapClickPesaStatus(rawStatus: string): ProviderTransactionStatus {
    switch (rawStatus) {
      case "SUCCESS":
        return "SUCCESS";
      case "SETTLED":
        return "SETTLED";
      case "PROCESSING":
        return "PROCESSING";
      case "PENDING":
        return "PENDING";
      case "FAILED":
        return "FAILED";
      case "ON-HOLD":
      case "ON_HOLD":
        return "ON_HOLD";
      case "REFUNDED":
        return "REFUNDED";
      case "REVERSED":
        return "REVERSED";
      default:
        return "UNKNOWN";
    }
  }
}
