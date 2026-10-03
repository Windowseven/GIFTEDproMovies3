import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { IS_PUBLIC_KEY, ALLOW_UNVERIFIED_KEY } from "../decorators/index.js";
import { SessionService } from "../services/session.service.js";
import { sanitizeUser, type SafeUser } from "../services/auth.service.js";
import type { SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: SafeUser;
    session?: SessionRecord;
  }
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const rawToken = this.extractToken(request);

    if (isPublic) {
      // If endpoint is public and token is provided, optionally resolve user context
      if (rawToken) {
        const resolved = await this.sessionService.resolveSession(rawToken);
        if (resolved) {
          request.session = resolved.session;
          request.user = sanitizeUser(resolved.user);
        }
      }
      return true;
    }

    if (!rawToken) {
      throw new UnauthorizedException("UNAUTHORIZED: Authentication required");
    }

    const resolved = await this.sessionService.resolveSession(rawToken);
    if (!resolved) {
      throw new UnauthorizedException("UNAUTHORIZED: Invalid or expired session");
    }

    // Touch session for activity tracking (throttled inside sessionService)
    void this.sessionService.touchSession(resolved.session.id, resolved.session.lastActiveAt);

    // Central Account-Status Enforcement
    const { user, session } = resolved;

    if (user.status === "suspended") {
      throw new ForbiddenException("ACCOUNT_SUSPENDED: Your account has been suspended");
    }

    if (user.status === "deactivated") {
      throw new ForbiddenException("ACCOUNT_DEACTIVATED: Your account has been deactivated");
    }

    if (user.status === "pending_verification") {
      const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!allowUnverified) {
        throw new ForbiddenException(
          "ACCOUNT_PENDING_VERIFICATION: Please verify your email before accessing this resource",
        );
      }
    }

    request.session = session;
    request.user = sanitizeUser(user);

    return true;
  }

  private extractToken(request: FastifyRequest): string | null {
    // 1. Check HTTP-only cookie
    const cookieToken = request.cookies?.["gifted_session"];
    if (cookieToken && typeof cookieToken === "string") {
      return cookieToken;
    }

    // 2. Check Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === "string") {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer") {
        return parts[1] ?? null;
      }
    }

    return null;
  }
}
