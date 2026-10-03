import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { CAPABILITIES_KEY } from "../decorators/index.js";
import { AccountService } from "../services/account.service.js";

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accountService: AccountService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<string>(
      CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapability) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("UNAUTHORIZED: Authentication required");
    }

    // Admin has operational role authority over administrative and staff checks
    if (user.role === "admin") {
      return true;
    }

    // Capabilities apply strictly to staff (media_team)
    if (user.role !== "media_team") {
      throw new ForbiddenException("INSUFFICIENT_CAPABILITY: Capabilities apply to staff only");
    }

    const capabilities = await this.accountService.getUserCapabilities(user.id);
    if (capabilities.includes(requiredCapability)) {
      return true;
    }

    throw new ForbiddenException(
      `INSUFFICIENT_CAPABILITY: Missing required capability '${requiredCapability}'`,
    );
  }
}
