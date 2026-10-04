import { Global, Module } from "@nestjs/common";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { EMAIL_SENDER } from "./email.tokens.js";
import { InMemoryEmailSender } from "./in-memory-email-sender.js";
import { ResendEmailSender } from "./resend-email-sender.js";
import type { EmailSender } from "./email-sender.interface.js";
import { EmailTemplateService } from "./email-template.service.js";
import { EmailOutboxService } from "./email-outbox.service.js";
import { EmailOutboxWorker } from "./email-outbox.worker.js";

@Global()
@Module({
  providers: [
    EmailTemplateService,
    {
      provide: EMAIL_SENDER,
      useFactory: (config: EnvironmentConfig, templateService: EmailTemplateService): EmailSender => {
        if (config.emailProvider === "resend" && config.resendApiKey) {
          return new ResendEmailSender(config, templateService);
        }
        return new InMemoryEmailSender();
      },
      inject: [ENVIRONMENT_CONFIG, EmailTemplateService],
    },
    InMemoryEmailSender,
    ResendEmailSender,
    EmailOutboxService,
    EmailOutboxWorker,
  ],
  exports: [
    EMAIL_SENDER,
    InMemoryEmailSender,
    ResendEmailSender,
    EmailTemplateService,
    EmailOutboxService,
    EmailOutboxWorker,
  ],
})
export class EmailModule {}
