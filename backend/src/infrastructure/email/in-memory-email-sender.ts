import { Injectable } from "@nestjs/common";
import type { EmailMessage, EmailSender } from "./email-sender.interface.js";

@Injectable()
export class InMemoryEmailSender implements EmailSender {
  private readonly sentMessages: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<void> {
    this.sentMessages.push({ ...message });
  }

  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Verify your GIFTEDproMovies email",
      text: `Your email verification token is: ${rawToken}`,
    });
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Reset your GIFTEDproMovies password",
      text: `Your password reset token is: ${rawToken}`,
    });
  }

  getSentMessages(): readonly EmailMessage[] {
    return [...this.sentMessages];
  }

  clear(): void {
    this.sentMessages.length = 0;
  }
}
