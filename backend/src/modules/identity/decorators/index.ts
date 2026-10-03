import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { UserRecord } from "../../../infrastructure/database/schemas/users.schema.js";
import type { SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";
import type { SafeUser } from "../services/auth.service.js";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOW_UNVERIFIED_KEY = "allowUnverified";
export const AllowUnverified = (): ReturnType<typeof SetMetadata> => SetMetadata(ALLOW_UNVERIFIED_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: Array<"customer" | "media_team" | "admin">): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

export const CAPABILITIES_KEY = "capabilities";
export const RequireCapability = (capability: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(CAPABILITIES_KEY, capability);

export const CurrentUser = createParamDecorator(
  (field: keyof SafeUser | undefined, ctx: ExecutionContext): SafeUser | UserRecord | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: SafeUser }>();
    const user = request.user;
    if (!user) return null;
    return field ? user[field] : user;
  },
);

export const CurrentSession = createParamDecorator(
  (field: keyof SessionRecord | undefined, ctx: ExecutionContext): SessionRecord | unknown => {
    const request = ctx.switchToHttp().getRequest<{ session?: SessionRecord }>();
    const session = request.session;
    if (!session) return null;
    return field ? session[field] : session;
  },
);
