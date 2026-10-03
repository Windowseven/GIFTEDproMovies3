import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AccountService } from "../services/account.service.js";
import { UpdateStatusDto, UpdateRoleDto, GrantCapabilityDto } from "../dto/index.js";
import { CurrentUser, Roles } from "../decorators/index.js";
import { SessionAuthGuard } from "../guards/session-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";
import type { SafeUser } from "../services/auth.service.js";

@Controller("admin/users")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles("admin")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get(":id")
  async getUser(
    @Param("id") id: string,
  ): Promise<{ user: SafeUser; capabilities: string[] }> {
    const user = await this.accountService.getSafeUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    const capabilities = await this.accountService.getUserCapabilities(id);
    return { user, capabilities };
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() admin: SafeUser,
  ): Promise<{ user: SafeUser }> {
    const user = await this.accountService.updateAccountStatus(
      admin.id,
      id,
      dto.status,
    );
    return { user };
  }

  @Patch(":id/role")
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() admin: SafeUser,
  ): Promise<{ user: SafeUser }> {
    const user = await this.accountService.updateUserRole(
      admin.id,
      id,
      dto.role,
    );
    return { user };
  }

  @Post(":id/capabilities")
  @HttpCode(HttpStatus.CREATED)
  async grantCapability(
    @Param("id") id: string,
    @Body() dto: GrantCapabilityDto,
    @CurrentUser() admin: SafeUser,
  ): Promise<{ message: string }> {
    await this.accountService.grantCapability(admin.id, id, dto.capability);
    return { message: `Capability '${dto.capability}' granted successfully` };
  }

  @Delete(":id/capabilities/:capability")
  @HttpCode(HttpStatus.OK)
  async revokeCapability(
    @Param("id") id: string,
    @Param("capability") capability: string,
    @CurrentUser() admin: SafeUser,
  ): Promise<{ message: string }> {
    await this.accountService.revokeCapability(admin.id, id, capability);
    return { message: `Capability '${capability}' revoked successfully` };
  }
}
