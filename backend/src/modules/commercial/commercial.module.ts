import { Module } from "@nestjs/common";
import { CommercialRepository } from "./commercial.repository.js";
import {
  AccessPlanService,
  CommercialService,
  OfferService,
  PlanVersionService,
} from "./commercial.service.js";
import { CommercialController } from "./commercial.controller.js";
import { OrderService } from "./order.service.js";
import { OrdersController } from "./orders.controller.js";
import { PaymentService } from "./payment.service.js";
import { PaymentsController } from "./payments.controller.js";
import { CommercialWebhooksController } from "./commercial-webhooks.controller.js";
import { ReconciliationService } from "./reconciliation.service.js";
import { ReconciliationController } from "./reconciliation.controller.js";
import { EntitlementService } from "./entitlement.service.js";
import { FulfillmentService } from "./fulfillment.service.js";
import { CommercialAccessService } from "./commercial-access.service.js";
import { CustomerAccessController } from "./customer-access.controller.js";
import { PAYMENT_GATEWAY_PORT } from "./commercial.tokens.js";
import type { PaymentGatewayPort } from "./ports/payment-gateway.port.js";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { ClickPesaTokenManager } from "./adapters/clickpesa-token.manager.js";
import { ClickPesaPaymentAdapter } from "./adapters/clickpesa.adapter.js";
import { SimulatedClickPesaAdapter } from "./adapters/simulated-clickpesa.adapter.js";
import { PalmPesaPaymentAdapter } from "./adapters/palmpesa.adapter.js";
import { SimulatedPalmPesaAdapter } from "./adapters/simulated-palmpesa.adapter.js";
import { PaymentReconciliationWorker } from "./workers/payment-reconciliation.worker.js";

@Module({
  controllers: [
    CommercialController,
    OrdersController,
    PaymentsController,
    CommercialWebhooksController,
    ReconciliationController,
    CustomerAccessController,
  ],
  providers: [
    CommercialRepository,
    AccessPlanService,
    PlanVersionService,
    OfferService,
    CommercialService,
    OrderService,
    PaymentService,
    ReconciliationService,
    EntitlementService,
    FulfillmentService,
    CommercialAccessService,
    PaymentReconciliationWorker,
    {
      provide: PAYMENT_GATEWAY_PORT,
      inject: [ENVIRONMENT_CONFIG],
      useFactory: (env: EnvironmentConfig): PaymentGatewayPort => {
        const provider =
          env.paymentProvider ??
          (env.appEnvironment === "production" ? "palmpesa" : "simulated");

        if (provider === "clickpesa") {
          if (env.clickPesaClientId && env.clickPesaApiKey) {
            const tokenManager = new ClickPesaTokenManager({
              clientId: env.clickPesaClientId,
              apiKey: env.clickPesaApiKey,
              tokenEndpointUrl: env.clickPesaBaseUrl
                ? `${env.clickPesaBaseUrl}/third-parties/generate-token`
                : undefined,
            });
            return new ClickPesaPaymentAdapter(tokenManager, {
              baseUrl: env.clickPesaBaseUrl,
            });
          }
          if (env.appEnvironment === "production") {
            throw new Error(
              "ClickPesa credentials (CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY) are required in production.",
            );
          }
          return new SimulatedClickPesaAdapter();
        }

        if (provider === "palmpesa") {
          if (env.palmpesaApiToken) {
            return new PalmPesaPaymentAdapter({
              apiToken: env.palmpesaApiToken,
              baseUrl: env.palmpesaBaseUrl,
            });
          }
          if (env.appEnvironment === "production") {
            throw new Error(
              "PalmPesa credentials (PALMPESA_API_TOKEN) are required in production.",
            );
          }
          return new SimulatedPalmPesaAdapter();
        }

        if (env.appEnvironment === "production") {
          throw new Error("Simulator cannot be used as the payment provider in production.");
        }
        return new SimulatedPalmPesaAdapter();
      },
    },
  ],
  exports: [
    CommercialRepository,
    CommercialService,
    OrderService,
    PaymentService,
    ReconciliationService,
    EntitlementService,
    FulfillmentService,
    CommercialAccessService,
    PaymentReconciliationWorker,
    PAYMENT_GATEWAY_PORT,
  ],
})
export class CommercialModule {}

