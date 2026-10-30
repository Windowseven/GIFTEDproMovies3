import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Public } from "../identity/decorators/index.js";
import { ClickPesaWebhookDto } from "./dto/clickpesa-webhook.dto.js";
import { PalmPesaWebhookDto } from "./dto/palmpesa-webhook.dto.js";
import { PaymentService } from "./payment.service.js";

@Controller()
export class CommercialWebhooksController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post(["commercial/webhooks/clickpesa", "webhooks/clickpesa"])
  @HttpCode(HttpStatus.OK)
  async handleClickPesaWebhook(
    @Body() dto: ClickPesaWebhookDto,
    @Headers("x-clickpesa-signature") clickpesaSignature: string | undefined,
    @Headers("x-signature") signature: string | undefined,
    @Headers("x-checksum") checksum: string | undefined,
    @Req() req: FastifyRequest,
  ): Promise<{ received: boolean; status: string; idempotentReplay?: boolean }> {
    const signatureCandidate =
      clickpesaSignature ?? signature ?? checksum ?? dto.checksum;
    const rawPayload = req.body ?? dto;

    const result = await this.paymentService.processClickPesaWebhook(
      dto,
      rawPayload,
      signatureCandidate,
    );

    return {
      received: result.processed,
      status: result.status,
      idempotentReplay: result.idempotentReplay,
    };
  }

  @Public()
  @Post(["commercial/webhooks/palmpesa", "webhooks/palmpesa"])
  @HttpCode(HttpStatus.OK)
  async handlePalmPesaWebhook(
    @Body() dto: PalmPesaWebhookDto,
    @Headers("x-palmpesa-signature") palmpesaSignature: string | undefined,
    @Headers("x-signature") signature: string | undefined,
    @Headers("x-palmpesa-timestamp") palmpesaTimestamp: string | undefined,
    @Headers("x-timestamp") timestamp: string | undefined,
    @Req() req: FastifyRequest,
  ): Promise<{ received: boolean; status: string; idempotentReplay?: boolean }> {
    const signatureCandidate = palmpesaSignature ?? signature;
    const timestampCandidate = palmpesaTimestamp ?? timestamp;
    const rawPayload = req.body ?? dto;

    const result = await this.paymentService.processPalmPesaWebhook(
      dto,
      rawPayload,
      signatureCandidate,
      timestampCandidate,
    );

    return {
      received: result.processed,
      status: result.status,
      idempotentReplay: result.idempotentReplay,
    };
  }
}
