import { IsIn, IsOptional } from "class-validator";

export class CreatePaymentAttemptDto {
  @IsOptional()
  @IsIn(["simulated"])
  providerName?: string;
}

