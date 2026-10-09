import { Type } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

export class CreateAccessPlanDto {
  @Type(() => String)
  @IsString()
  @Length(1, 64)
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,63}$/u, {
    message: "Access plan code must use safe uppercase alphanumeric characters and optional underscores or hyphens.",
  })
  code!: string;

  @Type(() => String)
  @IsString()
  @Length(1, 255)
  name!: string;
}
