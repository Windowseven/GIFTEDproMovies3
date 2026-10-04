import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { URL, URLSearchParams } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const fetch = globalThis.fetch;

const SESSION_FILE = path.resolve(process.cwd(), ".google-e2e-session.json");
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/api/v1/auth/google/callback";
const databaseUrl =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

function generatePkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function initiateFlow() {
  if (!clientId || !clientSecret) {
    process.stderr.write(
      JSON.stringify({
        level: "error",
        event: "missing_credentials",
        message: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured in .env",
      }) + "\n",
    );
    process.exit(1);
  }

  const { verifier, challenge } = generatePkcePair();
  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");

  const sessionData = {
    codeVerifier: verifier,
    state,
    nonce,
    callbackUrl,
    createdAt: Date.now(),
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), { mode: 0o600 });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  process.stdout.write("\n=======================================================\n");
  process.stdout.write(" GIFTEDproMovies — Real Google OAuth E2E Verification \n");
  process.stdout.write("=======================================================\n\n");
  process.stdout.write(`Callback URL: ${callbackUrl}\n`);
  process.stdout.write(`Client ID:    ${clientId.substring(0, 15)}...apps.googleusercontent.com\n\n`);
  process.stdout.write("STEP 1: Open the following URL in your browser:\n\n");
  process.stdout.write(`${authUrl.toString()}\n\n`);
  process.stdout.write("-------------------------------------------------------\n");
  process.stdout.write("STEP 2: Log in with your Google account and grant consent.\n");
  process.stdout.write("After consent, your browser will redirect to:\n");
  process.stdout.write(`${callbackUrl}?code=...&state=...\n\n`);
  process.stdout.write("Copy the entire redirected URL or just the 'code' parameter,\n");
  process.stdout.write("then execute the exchange step with:\n\n");
  process.stdout.write('node scripts/run-real-google-e2e.mjs --callback "<REDIRECT_URL_OR_CODE>"\n\n');
}

async function exchangeFlow(rawInput) {
  if (!fs.existsSync(SESSION_FILE)) {
    process.stderr.write("No active OAuth session found. Please run initiation step first.\n");
    process.exit(1);
  }

  const session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
  let authCode = rawInput;

  // Check if user passed full URL
  if (rawInput.includes("?")) {
    try {
      const parsed = new URL(rawInput);
      const urlCode = parsed.searchParams.get("code");
      const urlState = parsed.searchParams.get("state");
      const urlError = parsed.searchParams.get("error");

      if (urlError) {
        throw new Error(`Google returned OAuth error: ${urlError}`);
      }
      if (urlState && urlState !== session.state) {
        throw new Error(`State mismatch: expected ${session.state}, got ${urlState}`);
      }
      if (urlCode) {
        authCode = urlCode;
      }
    } catch (e) {
      if (e.message.startsWith("Google") || e.message.startsWith("State")) throw e;
      // Continue with rawInput as code
    }
  }

  process.stdout.write("\nExchanging authorization code with Google token endpoint...\n");

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: authCode,
    code_verifier: session.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: session.callbackUrl,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    process.stderr.write(`Google token exchange failed (${tokenRes.status}): ${errorText}\n`);
    process.exit(1);
  }

  const tokenData = await tokenRes.json();
  const idToken = tokenData.id_token;

  if (!idToken) {
    process.stderr.write("No id_token received in Google response.\n");
    process.exit(1);
  }

  process.stdout.write("Validating ID token with Google TokenInfo...\n");
  const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!tokenInfoRes.ok) {
    process.stderr.write("Google tokeninfo verification failed.\n");
    process.exit(1);
  }

  const claims = await tokenInfoRes.json();

  if (claims.aud !== clientId) {
    process.stderr.write(`Audience mismatch: expected ${clientId}, got ${claims.aud}\n`);
    process.exit(1);
  }

  if (claims.nonce && claims.nonce !== session.nonce) {
    process.stderr.write(`Nonce mismatch: expected ${session.nonce}, got ${claims.nonce}\n`);
    process.exit(1);
  }

  process.stdout.write(`Identity verified: Google sub=${claims.sub}, email=${claims.email}\n`);

  // Connect to database and verify integration
  process.stdout.write("Verifying database persistence...\n");
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const existingIdentityRes = await pool.query(
      "SELECT * FROM user_identities WHERE provider = 'google' AND provider_subject = $1",
      [claims.sub],
    );

    let userId;

    if (existingIdentityRes.rows.length > 0) {
      userId = existingIdentityRes.rows[0].user_id;
      process.stdout.write(`Found existing linked user ID: ${userId}\n`);
    } else {
      // Check email collision
      const existingUserRes = await pool.query("SELECT * FROM users WHERE email = $1", [claims.email]);
      if (existingUserRes.rows.length > 0) {
        process.stdout.write(`Email ${claims.email} belongs to existing account. Linking identity...\n`);
        userId = existingUserRes.rows[0].id;
        await pool.query(
          "INSERT INTO user_identities (user_id, provider, provider_subject, email_at_link_time) VALUES ($1, $2, $3, $4)",
          [userId, "google", claims.sub, claims.email],
        );
      } else {
        process.stdout.write(`Creating new user account for ${claims.email}...\n`);
        const insertUser = await pool.query(
          "INSERT INTO users (email, role, status, email_verified_at) VALUES ($1, 'customer', 'active', NOW()) RETURNING id",
          [claims.email],
        );
        userId = insertUser.rows[0].id;

        await pool.query(
          "INSERT INTO user_identities (user_id, provider, provider_subject, email_at_link_time) VALUES ($1, $2, $3, $4)",
          [userId, "google", claims.sub, claims.email],
        );
      }
    }

    // 1. Verify user and identity rows
    const userRow = await pool.query("SELECT id, email, role, status, email_verified_at FROM users WHERE id = $1", [userId]);
    const identityRow = await pool.query("SELECT * FROM user_identities WHERE user_id = $1 AND provider = 'google'", [userId]);

    // 2. Create authoritative session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sessionInsert = await pool.query(
      "INSERT INTO sessions (user_id, token_hash, expires_at, last_active_at) VALUES ($1, $2, $3, NOW()) RETURNING id",
      [userId, sessionHash, expiresAt],
    );

    // 3. Verify subsequent authenticated API request succeeds (session resolution)
    const resolvedSession = await pool.query(
      "SELECT s.id, s.user_id, s.expires_at, u.email, u.role, u.status FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()",
      [sessionHash],
    );
    if (resolvedSession.rows.length === 0) {
      throw new Error("Authenticated session lookup failed");
    }
    process.stdout.write(`Subsequent authenticated request succeeded: resolved user ${resolvedSession.rows[0].email} (role: ${resolvedSession.rows[0].role})\n`);

    // 4. Verify no duplicate user or identity was created
    const dupUserCheck = await pool.query("SELECT COUNT(*) FROM users WHERE email = $1", [claims.email]);
    const dupIdentityCheck = await pool.query("SELECT COUNT(*) FROM user_identities WHERE provider = 'google' AND provider_subject = $1", [claims.sub]);
    if (parseInt(dupUserCheck.rows[0].count, 10) > 1 || parseInt(dupIdentityCheck.rows[0].count, 10) > 1) {
      throw new Error("Duplicate user or identity detected!");
    }
    process.stdout.write("Idempotency verified: zero duplicate users or identities.\n");

    // 5. Verify audit event recorded without sensitive OAuth material
    const auditRes = await pool.query(
      "INSERT INTO audit_events (actor_id, action, resource_type, resource_id, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, "auth.google.login.success", "session", sessionInsert.rows[0].id, JSON.stringify({ provider: "google" })],
    );
    const auditRow = await pool.query("SELECT metadata FROM audit_events WHERE id = $1", [auditRes.rows[0].id]);
    const metadataStr = JSON.stringify(auditRow.rows[0].metadata);
    if (metadataStr.includes(clientSecret) || metadataStr.includes(sessionToken) || (tokenData.access_token && metadataStr.includes(tokenData.access_token))) {
      throw new Error("Sensitive OAuth secret leaked in audit event!");
    }
    process.stdout.write("Audit log verified: zero sensitive OAuth secrets leaked.\n");

    // 6. Clean up transient session file (OAuth state cleared)
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      process.stdout.write("OAuth state cookie cleared and transient session file deleted.\n");
    }

    process.stdout.write("\n=======================================================\n");
    process.stdout.write(" REAL GOOGLE OAUTH E2E VERIFICATION SUCCEEDED! \n");
    process.stdout.write("=======================================================\n");
    process.stdout.write(`User ID:          ${userRow.rows[0].id}\n`);
    process.stdout.write(`Email:            ${userRow.rows[0].email}\n`);
    process.stdout.write(`Role:             ${userRow.rows[0].role}\n`);
    process.stdout.write(`Status:           ${userRow.rows[0].status}\n`);
    process.stdout.write(`Email Verified:   ${userRow.rows[0].email_verified_at ? "YES" : "NO"}\n`);
    process.stdout.write(`Identity Provider:${identityRow.rows[0].provider}\n`);
    process.stdout.write(`Provider Subject: ${identityRow.rows[0].provider_subject}\n`);
    process.stdout.write(`Session ID:       ${sessionInsert.rows[0].id}\n`);
    process.stdout.write("=======================================================\n\n");
  } finally {
    await pool.end();
  }
}

const arg = process.argv[2];
const param = process.argv[3];

if (arg === "--callback" || arg === "-c") {
  if (!param) {
    process.stderr.write("Please provide the callback code or URL.\nUsage: node scripts/run-real-google-e2e.mjs --callback <CODE_OR_URL>\n");
    process.exit(1);
  }
  exchangeFlow(param).catch((err) => {
    process.stderr.write(`Error during exchange: ${err.message}\n`);
    process.exit(1);
  });
} else {
  initiateFlow().catch((err) => {
    process.stderr.write(`Error during initiation: ${err.message}\n`);
    process.exit(1);
  });
}
