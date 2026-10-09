import { IsNotEmpty, IsString, IsUUID, Length, Matches } from "class-validator";

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID("4", { message: "offerId must be a valid UUID v4" })
  offerId!: string;

  @IsNotEmpty()
  @IsString({ message: "idempotencyKey must be a string" })
  @Length(1, 128, { message: "idempotencyKey must be between 1 and 128 characters" })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: "idempotencyKey may only contain alphanumerics, underscores, and hyphens",
  })
  idempotencyKey!: string;
}
