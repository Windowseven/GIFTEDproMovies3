import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class ClickPesaWebhookDto {
  @IsString()
  @IsNotEmpty()
  orderReference!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  checksumMethod?: string;
}
