import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import {
  CommercialAccessService,
  type AccessDecision,
  type CustomerLibraryResponse,
} from "./commercial-access.service.js";

@Controller("commercial/me")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("customer", "admin")
export class CustomerAccessController {
  constructor(private readonly accessService: CommercialAccessService) {}

  @Get("library")
  @HttpCode(HttpStatus.OK)
  async getMyLibrary(
    @CurrentUser("id") customerId: string,
  ): Promise<CustomerLibraryResponse> {
    return await this.accessService.getCustomerLibrary(customerId);
  }

  @Get("access/:contentId")
  @HttpCode(HttpStatus.OK)
  async checkAccess(
    @Param("contentId", new ParseUUIDPipe({ version: "4" })) contentId: string,
    @CurrentUser("id") customerId: string,
    @Query("seasonId") seasonId?: string,
    @Query("episodeId") episodeId?: string,
  ): Promise<AccessDecision> {
    return await this.accessService.canAccess(customerId, {
      contentId,
      seasonId,
      episodeId,
    });
  }
}
