import { Global, Module } from "@nestjs/common";
import { loadEnvironment, type EnvironmentConfig } from "./environment.js";
import { ENVIRONMENT_CONFIG } from "./tokens.js";

@Global()
@Module({
  providers: [
    {
      provide: ENVIRONMENT_CONFIG,
      useFactory: (): EnvironmentConfig => loadEnvironment(process.env),
    },
  ],
  exports: [ENVIRONMENT_CONFIG],
})
export class EnvironmentModule {}
