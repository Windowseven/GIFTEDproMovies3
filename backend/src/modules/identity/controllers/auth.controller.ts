import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService, type SafeUser } from "../services/auth.service.js";
import { AccountService } from "../services/account.service.js";
import { GoogleAuthService } from "../services/google-auth.service.js";
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  LinkGoogleDto,
} from "../dto/index.js";
import {
  Public,
  AllowUnverified,
  CurrentUser,
  CurrentSession,
} from "../decorators/index.js";
import { SessionAuthGuard } from "../guards/session-auth.guard.js";
import { ENVIRONMENT_CONFIG } from "../../../config/tokens.js";
import type { EnvironmentConfig } from "../../../config/environment.js";
import type { SessionRecord } from "../../../infrastructure/database/schemas/sessions.schema.js";
import {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from "../utils/oauth-state.js";

const COOKIE_NAME = "gifted_session";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days absolute max

@Controller("auth")
@UseGuards(SessionAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountService: AccountService,
    private readonly googleAuthService: GoogleAuthService,
    @Inject(ENVIRONMENT_CONFIG)
    private readonly config: EnvironmentConfig,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<{ message: string; user: SafeUser }> {
    const user = await this.authService.register(dto.email, dto.password);
    return {
      message: "Registration successful. Please check your email to verify your account.",
      user,
    };
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto.token);
    return { message: "Email successfully verified." };
  }

  @Public()
  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ message: string }> {
    await this.authService.resendVerification(dto.email);
    return {
      message: "If the email is registered and unverified, a verification link has been sent.",
    };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    user: SafeUser;
    session: { id: string; expiresAt: Date; lastActiveAt: Date };
  }> {
    const ipAddress = request.ip;
    const userAgent = request.headers["user-agent"] ?? null;

    const deviceMeta = dto.deviceIdentifier
      ? {
          deviceIdentifier: dto.deviceIdentifier,
          deviceName: dto.deviceName ?? "Unknown Device",
          deviceType: dto.deviceType ?? "other",
        }
      : null;

    const { user, session, rawToken } = await this.authService.login(
      dto.email,
      dto.password,
      deviceMeta,
      ipAddress,
      userAgent,
    );

    reply.setCookie(COOKIE_NAME, rawToken, {
      path: "/",
      httpOnly: true,
      secure: this.config.appEnvironment === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return {
      user,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
      },
    };
  }

  @Public()
  @Post("request-password-reset")
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto.email);
    return {
      message: "If the email is registered, password reset instructions have been sent.",
    };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return {
      message: "Password has been successfully reset. Please log in with your new password.",
    };
  }

  @AllowUnverified()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentSession() session: SessionRecord,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    if (session) {
      await this.authService.logout(session.id);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { message: "Logged out successfully" };
  }

  @AllowUnverified()
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    if (user) {
      await this.authService.logoutAll(user.id);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { message: "Logged out from all sessions" };
  }

  @AllowUnverified()
  @Get("me")
  async getMe(
    @CurrentUser() user: SafeUser,
    @CurrentSession() session: SessionRecord,
  ): Promise<{
    user: SafeUser;
    session: { id: string; expiresAt: Date; lastActiveAt: Date };
    capabilities: string[];
  }> {
    const capabilities =
      user.role === "admin" || user.role === "media_team"
        ? await this.accountService.getUserCapabilities(user.id)
        : [];

    return {
      user,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
      },
      capabilities,
    };
  }

  @Public()
  @Get("google")
  async googleAuth(
    @Query("returnTo") returnTo: string | undefined,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { authorizationUrl, stateCookie } =
      this.googleAuthService.getAuthorizationUrl(returnTo);

    reply.setCookie(OAUTH_STATE_COOKIE_NAME, stateCookie, {
      path: "/api/v1/auth/google",
      httpOnly: true,
      secure: this.config.appEnvironment === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    });

    reply.status(302).redirect(authorizationUrl);
  }

  @Public()
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const cookies = (request.cookies || {}) as Record<string, string | undefined>;
    const stateCookie = cookies[OAUTH_STATE_COOKIE_NAME];

    // Single-use: clear state cookie immediately
    reply.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      path: "/api/v1/auth/google",
    });

    const result = await this.googleAuthService.handleCallback({
      code,
      state,
      error,
      stateCookie,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] ?? null,
    });

    if (result.rawToken) {
      reply.setCookie(COOKIE_NAME, result.rawToken, {
        path: "/",
        httpOnly: true,
        secure: this.config.appEnvironment === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE_SECONDS,
      });
    }

    reply.status(302).redirect(result.redirectUrl);
  }

  @Post("google/link")
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @Body() dto: LinkGoogleDto,
    @CurrentUser() user: SafeUser,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    const cookies = (request.cookies || {}) as Record<string, string | undefined>;
    const stateCookie = cookies[OAUTH_STATE_COOKIE_NAME];

    reply.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      path: "/api/v1/auth/google",
    });

    return this.googleAuthService.linkAccount(
      user,
      dto.code,
      dto.state,
      stateCookie,
    );
  }

  @Delete("google/unlink")
  @HttpCode(HttpStatus.OK)
  async unlinkGoogle(
    @CurrentUser() user: SafeUser,
  ): Promise<{ message: string }> {
    return this.googleAuthService.unlinkAccount(user);
  }
}

