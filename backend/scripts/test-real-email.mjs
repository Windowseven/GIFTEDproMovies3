import process from "node:process";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
const recipient = process.argv[2] || "lespikiusjunior@gmail.com";

if (!apiKey) {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "real_email_test_failed",
      error: "RESEND_API_KEY is not defined in environment",
    }) + "\n",
  );
  process.exit(1);
}

const resend = new Resend(apiKey);

async function testDispatch() {
  const token = "live_test_token_" + Math.random().toString(36).substring(2, 10);
  const subject = "Verify your GIFTEDproMovies email address [Integration Test]";
  const text = `Welcome to GIFTEDproMovies!\n\nYour verification token is: ${token}\n\nThis is an automated delivery verification test.`;

  process.stdout.write(
    JSON.stringify({
      level: "info",
      event: "dispatching_email_request",
      from,
      recipient,
      subject,
    }) + "\n",
  );

  const response = await resend.emails.send({
    from,
    to: recipient,
    subject,
    text,
  });

  if (response.error) {
    process.stdout.write(
      JSON.stringify({
        level: "warn",
        event: "resend_api_rejected",
        errorName: response.error.name,
        errorMessage: response.error.message,
        recipient,
      }) + "\n",
    );
    return { success: false, error: response.error, token };
  }

  process.stdout.write(
    JSON.stringify({
      level: "info",
      event: "resend_api_accepted",
      messageId: response.data?.id,
      recipient,
    }) + "\n",
  );

  return { success: true, messageId: response.data?.id, token };
}

testDispatch()
  .then((res) => {
    if (!res.success) {
      process.exit(2);
    }
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(
      JSON.stringify({
        level: "error",
        event: "network_or_system_error",
        error: err instanceof Error ? err.message : String(err),
      }) + "\n",
    );
    process.exit(1);
  });
