import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CurrentUser, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import type { OrderRecord } from "../../infrastructure/database/schemas/commercial.schema.js";
import { CreateOrderDto } from "./dto/create-order.dto.js";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto.js";
import {
  OrderService,
  type PaginatedOrdersResponse,
} from "./order.service.js";

@Controller("orders")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("customer")
export class OrdersController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser("id") customerId: string,
    @Req() req: FastifyRequest,
  ): Promise<OrderRecord> {
    return await this.orderService.createOrder(dto, customerId, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCustomerOrders(
    @CurrentUser("id") customerId: string,
    @Query() query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponse> {
    return await this.orderService.getCustomerOrders(customerId, query);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getOrder(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser("id") customerId: string,
  ): Promise<OrderRecord> {
    return await this.orderService.getOrderForCustomer(id, customerId);
  }
}
