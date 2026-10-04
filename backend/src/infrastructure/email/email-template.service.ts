import { Inject, Injectable } from "@nestjs/common";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import type { EmailMessage } from "./email-sender.interface.js";

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

@Injectable()
export class EmailTemplateService {
  private readonly frontendUrl: string;

  constructor(
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
  ) {
    this.frontendUrl = config.frontendUrl.replace(/\/+$/, "");
  }

  generateVerificationEmail(to: string, rawToken: string): EmailMessage {
    const safeTo = escapeHtml(to);
    const verificationUrlObj = new URL("/verify-email", this.frontendUrl);
    verificationUrlObj.searchParams.set("token", rawToken);
    const verificationUrl = verificationUrlObj.toString();
    const safeUrl = escapeHtml(verificationUrl);
    const subject = "Verify your GIFTEDproMovies email address";

    const text = [
      "Welcome to GIFTEDproMovies.",
      "",
      "Please verify your email address to activate your account by visiting the following link:",
      verificationUrl,
      "",
      "This link expires in 24 hours and can only be used once.",
      "",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
    <tr>
      <td>
        <h1 style="color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 700; letter-spacing: -0.5px;">GIFTED<span style="color: #6366f1;">pro</span>Movies</h1>
        <h2 style="color: #e5e7eb; font-size: 18px; margin-top: 0; margin-bottom: 16px; font-weight: 600;">Verify your email address</h2>
        <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
          Welcome to GIFTEDproMovies.
        </p>
        <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Please verify your email address (<strong style="color: #f3f4f6;">${safeTo}</strong>) to activate your account.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#4f46e5">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Verify Email Address</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #4f46e5; color: #ffffff; display: inline-block; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; text-align: center;">
            Verify Email Address
          </a>
          <!--<![endif]-->
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 16px;">
          If the button above does not work, copy and paste the following link into your browser:
        </p>
        <p style="color: #6366f1; font-size: 13px; line-height: 1.5; word-break: break-all; margin-bottom: 24px;">
          <a href="${safeUrl}" style="color: #818cf8; text-decoration: underline;">${safeUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #1f2937; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-bottom: 6px;">
          This link expires in 24 hours and can only be used once.
        </p>
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { to, subject, text, html };
  }

  generatePasswordResetEmail(to: string, rawToken: string): EmailMessage {
    const safeTo = escapeHtml(to);
    const resetUrlObj = new URL("/reset-password", this.frontendUrl);
    resetUrlObj.searchParams.set("token", rawToken);
    const resetUrl = resetUrlObj.toString();
    const safeUrl = escapeHtml(resetUrl);
    const subject = "Reset your GIFTEDproMovies password";

    const text = [
      "We received a request to reset your GIFTEDproMovies password.",
      "",
      "Please reset your password by visiting the following link:",
      resetUrl,
      "",
      "This link expires in 1 hour and can only be used once.",
      "Completing the reset will sign out your existing sessions.",
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
    <tr>
      <td>
        <h1 style="color: #ffffff; font-size: 24px; margin-top: 0; margin-bottom: 20px; font-weight: 700; letter-spacing: -0.5px;">GIFTED<span style="color: #6366f1;">pro</span>Movies</h1>
        <h2 style="color: #e5e7eb; font-size: 18px; margin-top: 0; margin-bottom: 16px; font-weight: 600;">Reset your password</h2>
        <p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
          We received a request to reset your password for <strong style="color: #f3f4f6;">${safeTo}</strong>.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="18%" stroke="f" fillcolor="#dc2626">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #dc2626; color: #ffffff; display: inline-block; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; text-align: center;">
            Reset Password
          </a>
          <!--<![endif]-->
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 16px;">
          If the button above does not work, copy and paste the following link into your browser:
        </p>
        <p style="color: #6366f1; font-size: 13px; line-height: 1.5; word-break: break-all; margin-bottom: 24px;">
          <a href="${safeUrl}" style="color: #818cf8; text-decoration: underline;">${safeUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #1f2937; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-bottom: 6px;">
          This link expires in 1 hour and can only be used once.
        </p>
        <p style="color: #f87171; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
          Completing the reset will sign out your existing sessions across all devices.
        </p>
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
          If you did not request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { to, subject, text, html };
  }
}
