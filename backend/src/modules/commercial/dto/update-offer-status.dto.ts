import { Type } from "class-transformer";
import { IsIn, IsString } from "class-validator";

export class UpdateOfferStatusDto {
  @Type(() => String)
  @IsString()
  @IsIn(["draft", "active", "inactive", "archived"])
  status!: "draft" | "active" | "inactive" | "archived";
}
