import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const ORDER_STATUS_LIST = [
  "PENDING_PAYMENT",
  "PAID",
  "EXPIRED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_LIST)[number];

export class ListOrdersQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: "limit must be an integer" })
  @Min(1, { message: "limit must be at least 1" })
  @Max(100, { message: "limit must not exceed 100" })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256, { message: "cursor must not exceed 256 characters" })
  cursor?: string;

  @IsOptional()
  @IsIn(ORDER_STATUS_LIST, {
    message: `status must be one of: ${ORDER_STATUS_LIST.join(", ")}`,
  })
  status?: OrderStatus;
}
