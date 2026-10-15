import { IsIn, IsInt, IsString, Matches, MaxLength, Min } from "class-validator";

export class SimulateConfirmPaymentDto {
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-.:]+$/, {
    message: "providerEventId must contain only alphanumeric characters, underscores, dashes, colons, or dots",
  })
  providerEventId!: string;

  @IsString()
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_\-.:]+$/, {
    message: "providerReference must contain only alphanumeric characters, underscores, dashes, colons, or dots",
  })
  providerReference!: string;

  @IsInt()
  @Min(0)
  amountTzs!: number;

  @IsIn(["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "UNKNOWN"])
  outcome!: "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
}

