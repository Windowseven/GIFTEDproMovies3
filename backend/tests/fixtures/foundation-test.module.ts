import { Module } from "@nestjs/common";
import { AppModule } from "../../src/app.module.js";
import { FoundationValidationFixtureController } from "./foundation-validation.controller.js";

@Module({
  imports: [AppModule],
  controllers: [FoundationValidationFixtureController],
})
export class FoundationTestModule {}
