import { Type } from "class-transformer";
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import type { AuditEventRecord } from "../../../infrastructure/database/schemas/audit-events.schema.js";

export class QueryAuditEventsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512, { message: "cursor must not exceed 512 characters" })
  cursor?: string;

  @IsOptional()
  @IsUUID("4", { message: "actorId must be a valid UUID v4" })
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64, { message: "resourceType must not exceed 64 characters" })
  resourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128, { message: "action must not exceed 128 characters" })
  action?: string;

  @IsOptional()
  @IsISO8601({}, { message: "startDate must be a valid ISO 8601 date string" })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: "endDate must be a valid ISO 8601 date string" })
  endDate?: string;
}

export interface PaginatedAuditEventsResponse {
  items: AuditEventRecord[];
  nextCursor: string | null;
}
