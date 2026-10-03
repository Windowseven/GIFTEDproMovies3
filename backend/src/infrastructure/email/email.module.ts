import { Global, Module } from "@nestjs/common";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { EMAIL_SENDER } from "./email.tokens.js";
import { InMemoryEmailSender } from "./in-memory-email-sender.js";
import { ResendEmailSender } from "./resend-email-sender.js";
import type { EmailSender } from "./email-sender.interface.js";

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: (config: EnvironmentConfig): EmailSender => {
        if (config.emailProvider === "resend" && config.resendApiKey) {
          return new ResendEmailSender(config);
        }
        return new InMemoryEmailSender();
      },
      inject: [ENVIRONMENT_CONFIG],
    },
    InMemoryEmailSender,
    ResendEmailSender,
  ],
  exports: [EMAIL_SENDER, InMemoryEmailSender, ResendEmailSender],
})
export class EmailModule {}
