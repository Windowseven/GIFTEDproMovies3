import { BadRequestException, ValidationPipe, RequestMethod } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationError } from "class-validator";
import { SuccessEnvelopeInterceptor } from "./success-envelope.interceptor.js";

export function configureHttpApplication(
  app: NestFastifyApplication,
): void {
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health/live", method: RequestMethod.GET },
      { path: "health/ready", method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors: ValidationError[]): BadRequestException =>
        new BadRequestException({
          validationErrors: errors.map((error) => ({
            field: error.property,
            messages: Object.values(error.constraints ?? {}),
          })),
        }),
    }),
  );
  app.useGlobalInterceptors(new SuccessEnvelopeInterceptor());
}
