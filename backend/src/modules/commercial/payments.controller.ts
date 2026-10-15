import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import type { PaymentAttemptRecord } from "../../infrastructure/database/schemas/commercial.schema.js";
import { CreatePaymentAttemptDto } from "./dto/create-payment-attempt.dto.js";
import { SimulateConfirmPaymentDto } from "./dto/simulate-confirm-payment.dto.js";
import { PaymentService, type SimulateConfirmPaymentResult } from "./payment.service.js";

@Controller()
@UseGuards(SessionAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("orders/:orderId/payment-attempts")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.CREATED)
  async createPaymentAttempt(
    @Param("orderId", new ParseUUIDPipe({ version: "4" })) orderId: string,
    @Body() dto: CreatePaymentAttemptDto,
    @CurrentUser("id") customerId: string,
  ): Promise<PaymentAttemptRecord> {
    return this.paymentService.createPaymentAttempt(customerId, orderId, dto);
  }

  @Get("orders/:orderId/payment-attempts")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async getPaymentAttempts(
    @Param("orderId", new ParseUUIDPipe({ version: "4" })) orderId: string,
    @CurrentUser("id") customerId: string,
  ): Promise<PaymentAttemptRecord[]> {
    return this.paymentService.getPaymentAttemptsForOrder(customerId, orderId);
  }

  @Post("payment-attempts/:attemptId/simulate-confirm")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  async simulateConfirm(
    @Param("attemptId", new ParseUUIDPipe({ version: "4" })) attemptId: string,
    @Body() dto: SimulateConfirmPaymentDto,
    @CurrentUser("id") currentUserId: string,
  ): Promise<SimulateConfirmPaymentResult> {
    return this.paymentService.simulateConfirmPayment(attemptId, dto, currentUserId);
  }
}
