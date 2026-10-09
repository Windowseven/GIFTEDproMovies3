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

@Module({
  controllers: [CommercialController, OrdersController],
  providers: [
    CommercialRepository,
    AccessPlanService,
    PlanVersionService,
    OfferService,
    CommercialService,
    OrderService,
  ],
  exports: [CommercialRepository, CommercialService, OrderService],
})
export class CommercialModule {}

