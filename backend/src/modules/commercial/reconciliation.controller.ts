import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import type { SettlementRecord } from "../../infrastructure/database/schemas/commercial.schema.js";
import { ReconciliationQueryDto } from "./dto/reconciliation-query.dto.js";
import {
  ReconciliationService,
  type ReconciliationDiscrepanciesResponse,
} from "./reconciliation.service.js";

@Controller("admin/reconciliation")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("admin")
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get("discrepancies")
  @HttpCode(HttpStatus.OK)
  async getDiscrepancies(
    @Query() query: ReconciliationQueryDto,
  ): Promise<ReconciliationDiscrepanciesResponse> {
    return this.reconciliationService.findDiscrepancies(query);
  }

  @Post("settlements/:attemptId/repair")
  @HttpCode(HttpStatus.OK)
  async repairSettlement(
    @Param("attemptId", new ParseUUIDPipe({ version: "4" })) attemptId: string,
    @CurrentUser("id") adminUserId: string,
  ): Promise<{ settlement: SettlementRecord; idempotentRepair: boolean }> {
    return this.reconciliationService.repairMissingSettlement(attemptId, adminUserId);
  }
}
