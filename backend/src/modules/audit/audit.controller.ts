import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuditService } from "./audit.service.js";
import {
  QueryAuditEventsDto,
  type PaginatedAuditEventsResponse,
} from "./dto/query-audit-events.dto.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import { Roles } from "../identity/decorators/index.js";

@Controller("admin/audit")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("admin")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditEvents(
    @Query() query: QueryAuditEventsDto,
  ): Promise<PaginatedAuditEventsResponse> {
    return this.auditService.queryAuditEvents(query);
  }
}
