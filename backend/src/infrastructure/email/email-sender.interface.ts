export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  sendEmail(message: EmailMessage): Promise<void>;
  sendVerificationEmail(to: string, rawToken: string): Promise<void>;
  sendPasswordResetEmail(to: string, rawToken: string): Promise<void>;
}
