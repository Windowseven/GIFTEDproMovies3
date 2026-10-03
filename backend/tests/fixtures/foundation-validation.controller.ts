import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsInt, IsString, Max, MaxLength, Min } from "class-validator";

class ValidationProbeDto {
  @IsString()
  @MaxLength(20)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;
}

@Controller("phase1-test")
export class FoundationValidationFixtureController {
  @Post("validation")
  validate(@Body() body: ValidationProbeDto): {
    name: string;
    count: number;
  } {
    return body;
  }

  @Get("unexpected-error")
  unexpectedError(): never {
    throw new Error("private diagnostic marker: must not reach the client");
  }
}
