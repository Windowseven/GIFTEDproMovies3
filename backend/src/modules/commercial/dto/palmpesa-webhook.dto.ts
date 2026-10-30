import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class PalmPesaWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  event!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  event_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  transaction_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  order_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  selcom_reference?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  status!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  channel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  processed_at?: string | null;
}
