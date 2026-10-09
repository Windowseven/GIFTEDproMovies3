import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import type { AccessPlanRecord, OfferRecord, PlanVersionRecord } from "../../infrastructure/database/schemas/commercial.schema.js";
import { CommercialService } from "./commercial.service.js";
import { CreateAccessPlanDto } from "./dto/create-access-plan.dto.js";
import { CreatePlanVersionDto } from "./dto/create-plan-version.dto.js";
import { CreateOfferDto } from "./dto/create-offer.dto.js";
import { UpdateOfferStatusDto } from "./dto/update-offer-status.dto.js";

@Controller("admin/commercial")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("admin")
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  @Get("access-plans")
  async listAccessPlans(): Promise<AccessPlanRecord[]> {
    return await this.commercialService.listAccessPlans();
  }

  @Post("access-plans")
  @HttpCode(HttpStatus.CREATED)
  async createAccessPlan(
    @Body() dto: CreateAccessPlanDto,
    @CurrentUser("id") actorId: string,
  ): Promise<AccessPlanRecord> {
    return await this.commercialService.createAccessPlan(dto, actorId);
  }

  @Get("access-plans/:id")
  async getAccessPlan(@Param("id") id: string): Promise<AccessPlanRecord> {
    return await this.commercialService.getAccessPlan(id);
  }

  @Get("plan-versions")
  async listPlanVersions(@Query("accessPlanId") accessPlanId?: string): Promise<PlanVersionRecord[]> {
    return await this.commercialService.listPlanVersions(accessPlanId);
  }

  @Post("plan-versions")
  @HttpCode(HttpStatus.CREATED)
  async createPlanVersion(
    @Body() dto: CreatePlanVersionDto,
    @CurrentUser("id") actorId: string,
  ): Promise<PlanVersionRecord> {
    return await this.commercialService.createPlanVersion(dto, actorId);
  }

  @Get("plan-versions/:id")
  async getPlanVersion(@Param("id") id: string): Promise<PlanVersionRecord> {
    return await this.commercialService.getPlanVersion(id);
  }

  @Get("offers")
  async listOffers(): Promise<OfferRecord[]> {
    return await this.commercialService.listOffers();
  }

  @Post("offers")
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @Body() dto: CreateOfferDto,
    @CurrentUser("id") actorId: string,
  ): Promise<OfferRecord> {
    return await this.commercialService.createOffer(dto, actorId);
  }

  @Get("offers/:id")
  async getOffer(@Param("id") id: string): Promise<OfferRecord> {
    return await this.commercialService.getOffer(id);
  }

  @Patch("offers/:id/status")
  @HttpCode(HttpStatus.OK)
  async updateOfferStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser("id") actorId: string,
  ): Promise<OfferRecord> {
    return await this.commercialService.updateOfferStatus(id, dto, actorId);
  }
}
