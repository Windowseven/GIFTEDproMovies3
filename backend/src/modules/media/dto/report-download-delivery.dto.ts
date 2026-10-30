import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class ReportDownloadDeliveryDto {
  @IsUUID("4", { message: "attemptId must be a valid UUID" })
  attemptId!: string;

  @IsIn(["COMPLETED", "FAILED"], {
    message: "status must be either 'COMPLETED' or 'FAILED'",
  })
  status!: "COMPLETED" | "FAILED";

  @IsOptional()
  @IsString()
  failureReason?: string;
}

export interface ReportDownloadDeliveryResult {
  attemptId: string;
  status: "COMPLETED" | "FAILED";
  retryEligible: boolean;
  retryGraceExpiresAt?: string;
  updatedAt: string;
}
