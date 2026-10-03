import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { ROLES_KEY } from "../decorators/index.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<"customer" | "media_team" | "admin">>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
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

    if (requiredRoles.includes(user.role as "customer" | "media_team" | "admin")) {
      return true;
    }

    throw new ForbiddenException("INSUFFICIENT_ROLE: Access denied");
  }
}
