import { IsBoolean, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";

export class InitiateCheckoutDto {
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(2048)
  returnUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(2048)
  cancelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[+]?[0-9\s-]{7,25}$/, {
    message: "phoneNumber must be a valid phone number format",
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerEmail?: string;

  @IsOptional()
  @IsBoolean()
  forceNew?: boolean;
}

export interface InitiateCheckoutResult {
  attemptId: string;
  attemptNumber: number;
  orderId: string;
  orderReference: string;
  paymentMode: "HOSTED_CHECKOUT" | "ASYNC_PROMPT";
  checkoutUrl?: string;
  statusUrl?: string;
  providerOrderId?: string;
  amountTzs: number;
  currency: "TZS";
  status: string;
  expiresAt: string;
}
