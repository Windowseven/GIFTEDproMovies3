import { Inject, Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import type { EmailMessage, EmailSender } from "./email-sender.interface.js";

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
  ) {
    this.resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
    this.from = config.emailFrom || "onboarding@resend.dev";
  }

  async sendEmail(message: EmailMessage): Promise<void> {
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
    const subject = "Verify your GIFTEDproMovies email address";
    const text = [
      "Welcome to GIFTEDproMovies!",
      "",
      `Your verification token is: ${rawToken}`,
      "",
      "Enter this token or submit it via the verification endpoint to activate your customer account.",
      "This verification token is valid for 24 hours and can only be used once.",
      "",
      "If you did not request this account, please ignore this email.",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 16px; font-weight: 700;">GIFTED<span style="color: #6366f1;">pro</span>Movies</h1>
    <h2 style="color: #e5e7eb; font-size: 18px; margin-top: 0; margin-bottom: 16px;">Verify your email address</h2>
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Welcome to GIFTEDproMovies! To complete your registration and activate your customer account, please use the verification code below:
    </p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 16px 20px; font-family: monospace; font-size: 16px; letter-spacing: 1px; color: #a5b4fc; word-break: break-all; text-align: center; margin-bottom: 24px;">
      ${rawToken}
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
      This single-use verification token is valid for 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({ to, subject, text, html });
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    const subject = "Reset your GIFTEDproMovies password";
    const text = [
      "You requested a password reset for your GIFTEDproMovies account.",
      "",
      `Your password reset token is: ${rawToken}`,
      "",
      "This token is valid for 1 hour. Upon successful password reset, all your active sessions will be terminated.",
      "",
      "If you did not request a password reset, please contact support immediately.",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 16px; font-weight: 700;">GIFTED<span style="color: #6366f1;">pro</span>Movies</h1>
    <h2 style="color: #e5e7eb; font-size: 18px; margin-top: 0; margin-bottom: 16px;">Password Reset Request</h2>
    <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      A password reset was requested for your GIFTEDproMovies account. Use the following reset code to update your password:
    </p>
    <div style="background-color: #1f2937; border-radius: 8px; padding: 16px 20px; font-family: monospace; font-size: 16px; letter-spacing: 1px; color: #f87171; word-break: break-all; text-align: center; margin-bottom: 24px;">
      ${rawToken}
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
      This single-use reset token expires in 1 hour. For your security, completing a password reset terminates all currently active sessions across all devices. If you did not request this change, please ignore this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({ to, subject, text, html });
  }
}
