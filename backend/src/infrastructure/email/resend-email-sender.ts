import { Inject, Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import type { EmailMessage, EmailSender } from "./email-sender.interface.js";
import { EmailTemplateService } from "./email-template.service.js";

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly templateService: EmailTemplateService;

  constructor(
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
    templateService?: EmailTemplateService,
  ) {
    this.resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
    this.from = config.emailFrom || "onboarding@resend.dev";
    this.templateService = templateService ?? new EmailTemplateService(config);
  }

  async sendEmail(message: EmailMessage): Promise<{ messageId?: string } | void> {
    if (!this.resend) {
      throw new Error("ResendEmailSender: RESEND_API_KEY is not configured");
    }
    try {
      const response = await this.resend.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      if (response.error) {
        this.logger.error(
          {
            errorName: response.error.name,
            errorMessage: response.error.message,
            to: message.to,
          },
          "Resend rejected email dispatch",
        );
        throw new Error(
          `Resend email dispatch rejected: ${response.error.message} (${response.error.name})`,
        );
      }

      this.logger.log(
        {
          messageId: response.data?.id,
          to: message.to,
        },
        "Resend email dispatched successfully",
      );

      return { messageId: response.data?.id };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("Resend email dispatch rejected:")) {
        throw error;
      }
      const messageText = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        {
          errorMessage: messageText,
          to: message.to,
        },
        "Failed to send email via Resend",
      );
      throw new Error(`Email provider transmission error: ${messageText}`, {
        cause: error,
      });
    }
  }

  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    const message = this.templateService.generateVerificationEmail(to, rawToken);
    await this.sendEmail(message);
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    const message = this.templateService.generatePasswordResetEmail(to, rawToken);
    await this.sendEmail(message);
  }
}
