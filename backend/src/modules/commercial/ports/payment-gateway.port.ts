export interface CheckoutInitiationRequest {
  orderId: string;
  attemptId: string;
  orderReference: string; // alphanumeric, max 20 chars for mobile money compatibility
  amountTzs: number;
  currency: "TZS";
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  callbackUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutInitiationResult {
  paymentMode: "HOSTED_CHECKOUT" | "ASYNC_PROMPT";
  providerReference: string;
  checkoutUrl?: string;
  statusUrl?: string;
  providerOrderId?: string;
}

export type ProviderTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "SETTLED"
  | "FAILED"
  | "ON_HOLD"
  | "REFUNDED"
  | "REVERSED"
  | "NOT_FOUND"
  | "UNKNOWN";

export interface TransactionStatusQueryResult {
  providerEventId?: string;
  providerReference: string;
  status: ProviderTransactionStatus;
  amountTzs?: number;
  currency?: string;
  rawStatus?: string;
}

export interface PaymentGatewayPort {
  readonly providerName: string;
  initiateCheckout(request: CheckoutInitiationRequest): Promise<CheckoutInitiationResult>;
  queryTransactionStatus(providerReference: string): Promise<TransactionStatusQueryResult>;
}
