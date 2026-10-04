import { Global, Module } from "@nestjs/common";
import { PasswordHasherService } from "./services/password-hasher.service.js";
import { SessionService } from "./services/session.service.js";
import { DeviceService } from "./services/device.service.js";
import { AuthService } from "./services/auth.service.js";
import { AccountService } from "./services/account.service.js";
import { GoogleAuthService } from "./services/google-auth.service.js";
import { GOOGLE_OAUTH_CLIENT } from "./services/google-oauth-client.interface.js";
import { DefaultGoogleOAuthClient } from "./services/default-google-oauth-client.js";
import { SessionAuthGuard } from "./guards/session-auth.guard.js";
import { RolesGuard } from "./guards/roles.guard.js";
import { CapabilitiesGuard } from "./guards/capabilities.guard.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AccountController } from "./controllers/account.controller.js";
import { DeviceController } from "./controllers/device.controller.js";

@Global()
@Module({
  controllers: [AuthController, AccountController, DeviceController],
  providers: [
    PasswordHasherService,
    SessionService,
    DeviceService,
    AuthService,
    AccountService,
    GoogleAuthService,
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useClass: DefaultGoogleOAuthClient,
    },
    SessionAuthGuard,
    RolesGuard,
    CapabilitiesGuard,
  ],
  exports: [
    PasswordHasherService,
    SessionService,
    DeviceService,
    AuthService,
    AccountService,
    GoogleAuthService,
    GOOGLE_OAUTH_CLIENT,
    SessionAuthGuard,
    RolesGuard,
    CapabilitiesGuard,
  ],
})
export class IdentityModule {}
