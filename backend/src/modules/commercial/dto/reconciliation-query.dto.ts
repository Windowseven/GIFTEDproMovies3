import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export type ReconciliationDiscrepancyType =
  | "MISSING_SETTLEMENT"
  | "AMOUNT_MISMATCH"
  | "ORPHAN_PAID_ORDER"
  | "STRANDED_UNKNOWN"
  | "CONFLICTING_SETTLEMENT_EVIDENCE";

export const RECONCILIATION_DISCREPANCY_TYPES: readonly ReconciliationDiscrepancyType[] = [
  "MISSING_SETTLEMENT",
  "AMOUNT_MISMATCH",
  "ORPHAN_PAID_ORDER",
  "STRANDED_UNKNOWN",
  "CONFLICTING_SETTLEMENT_EVIDENCE",
] as const;

export class ReconciliationQueryDto {
  @Type(() => String)
  @IsOptional()
  @IsIn(RECONCILIATION_DISCREPANCY_TYPES, {
    message: `type must be one of: ${RECONCILIATION_DISCREPANCY_TYPES.join(", ")}`,
  })
  type?: ReconciliationDiscrepancyType;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit?: number;

  @Type(() => String)
  @IsOptional()
  @IsString({ message: "cursor must be a string" })
  cursor?: string;

  @Type(() => String)
  @IsOptional()
  @IsISO8601({ strict: true }, { message: "windowStart must be a valid ISO 8601 timestamp string" })
  windowStart?: string;

  @Type(() => String)
  @IsOptional()
  @IsISO8601({ strict: true }, { message: "windowEnd must be a valid ISO 8601 timestamp string" })
  windowEnd?: string;
}
