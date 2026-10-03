import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Http2ServerRequest } from "node:http2";
import type { DestinationStream } from "pino";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { loadEnvironment, type EnvironmentConfig } from "./config/environment.js";
import { ApplicationLogger } from "./infrastructure/logging/application-logger.js";
import { createStructuredLogger } from "./infrastructure/logging/structured-logger.js";
import { ApiExceptionFilter } from "./http/api-exception.filter.js";
import { configureHttpApplication } from "./http/configure-http-application.js";

export async function createApplication(
  environment: EnvironmentConfig = loadEnvironment(process.env),
  logDestination?: DestinationStream,
): Promise<NestFastifyApplication> {
  const structuredLogger = createStructuredLogger(
    environment.logLevel,
    logDestination,
  );
  const adapter = new FastifyAdapter({
    loggerInstance: structuredLogger,
    requestIdHeader: false,
    genReqId: (request: IncomingMessage | Http2ServerRequest): string => {
      const supplied = request.headers["x-request-id"];
      if (
        typeof supplied === "string" &&
        supplied.length > 0 &&
        supplied.length <= 128 &&
        /^[A-Za-z0-9._:-]+$/.test(supplied)
      ) {
        return supplied;
      }
      return randomUUID();
    },
    trustProxy:
      environment.trustedProxyCidrs.length > 0
        ? [...environment.trustedProxyCidrs]
        : false,
    bodyLimit: environment.requestBodyLimitBytes,
    disableRequestLogging: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );
  const fastify = app.getHttpAdapter().getInstance();
  const logger = fastify.log;
  app.useLogger(new ApplicationLogger(logger));
  app.useGlobalFilters(new ApiExceptionFilter(logger));

  await fastify.register(fastifyCookie);
  await fastify.register(fastifyHelmet);
  await fastify.register(fastifyCors, {
    origin: [...environment.corsOrigins],
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-request-id", "authorization"],
  });

  fastify.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
      },
      "HTTP request completed",
    );
  });

  configureHttpApplication(app);
  configureOpenApi(app, environment);
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  await app.init();
  return app;
}

function configureOpenApi(
  app: NestFastifyApplication,
  environment: EnvironmentConfig,
): void {
  if (environment.appEnvironment === "production") return;

  const options = new DocumentBuilder()
    .setTitle("GIFTEDproMovies Backend API")
    .setDescription("Phase 1 foundation health contracts.")
    .setVersion("1.0.0")
    .build();
  const document = SwaggerModule.createDocument(app, options, {
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup("api/v1/docs", app, document, {
    useGlobalPrefix: false,
    jsonDocumentUrl: "api/v1/openapi.json",
  });
}

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment(process.env);
  const app = await createApplication(environment);
  await app.listen(environment.port, "0.0.0.0");
  app.getHttpAdapter().getInstance().log.info(
    { port: environment.port },
    "Backend service listening",
  );
}

void bootstrap().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  process.stderr.write(
    `${JSON.stringify({ level: "fatal", event: "startup_failed", errorType })}\n`,
  );
  process.exitCode = 1;
});
