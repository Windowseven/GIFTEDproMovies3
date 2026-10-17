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
import { ReconciliationService } from "./reconciliation.service.js";
import { ReconciliationController } from "./reconciliation.controller.js";

@Module({
  controllers: [
    CommercialController,
    OrdersController,
    PaymentsController,
    ReconciliationController,
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
  ],
  exports: [
    CommercialRepository,
    CommercialService,
    OrderService,
    PaymentService,
    ReconciliationService,
  ],
})
export class CommercialModule {}

