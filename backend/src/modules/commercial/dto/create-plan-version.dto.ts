import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export class CreatePlanVersionDto {
  @Type(() => String)
  @IsString()
  accessPlanId!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  versionNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationValue!: number;

  @Type(() => String)
  @IsString()
  @IsIn(["HOUR", "DAY"])
  durationUnit!: "HOUR" | "DAY";

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  downloadLimit?: number | null;

  @Type(() => String)
  @IsOptional()
  @IsString()
  @Length(1, 32)
  @IsIn(["UNIQUE_TITLES", "DOWNLOAD_ACTIONS"])
  downloadLimitType?: "UNIQUE_TITLES" | "DOWNLOAD_ACTIONS" | null;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  deviceLimit?: number | null;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  concurrentStreamLimit?: number | null;
}
