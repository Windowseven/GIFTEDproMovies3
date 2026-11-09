import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const credsPath = join(__dirname, "..", ".local-test-credentials.json");

const credsRaw = await readFile(credsPath, "utf-8");
const { accounts } = JSON.parse(credsRaw);

const baseUrl = "http://127.0.0.1:8001";

async function testAuthForRole(acc) {
  console.log(`\n========================================`);
  console.log(`Testing Authentication for Role: ${acc.role.toUpperCase()} (${acc.email})`);
  console.log(`========================================`);

  // 1. Invalid password check (tested on first role)
  if (acc.role === "customer") {
    console.log(`1. Testing invalid password rejection...`);
    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: acc.email, password: "WrongPassword!999" }),
    });
    console.log(`   Status: ${badLoginRes.status}`);
    if (badLoginRes.status !== 401) {
      throw new Error(`Expected 401 for bad password, got ${badLoginRes.status}`);
    }
    const badBody = await badLoginRes.json();
    console.log(`   Response:`, badBody.error?.message || badBody);
  }

  // 2. Real login with authentic credentials
  console.log(`2. Testing valid login with provisioned credentials...`);
  let loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: acc.email, password: acc.password }),
  });
  if (loginRes.status === 429) {
    const retryAfter = Number(loginRes.headers.get("retry-after") || 60);
    console.log(`   Rate limited (429). Waiting ${retryAfter}s as requested by backend...`);
    await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
    loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: acc.email, password: acc.password }),
    });
  }
  console.log(`   Status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    const errText = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${errText}`);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  console.log(`   Cookie issued:`, setCookie ? setCookie.split(";")[0] : "MISSING");
  if (!setCookie || !setCookie.includes("gifted_session=")) {
    throw new Error("Expected gifted_session cookie");
  }

  const cookieHeader = setCookie.split(";")[0];
  const loginData = await loginRes.json();
  console.log(`   User authenticated:`, {
    id: loginData.data?.user?.id,
    email: loginData.data?.user?.email,
    role: loginData.data?.user?.role,
    status: loginData.data?.user?.status,
  });

  if (loginData.data?.user?.role !== acc.role) {
    throw new Error(`Role mismatch: expected ${acc.role}, got ${loginData.data?.user?.role}`);
  }

  // 3. Session verification (/api/v1/auth/me)
  console.log(`3. Verifying session via GET /api/v1/auth/me...`);
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  console.log(`   Status: ${meRes.status}`);
  if (meRes.status !== 200) {
    throw new Error(`/auth/me failed with status ${meRes.status}`);
  }
  const meData = await meRes.json();
  console.log(`   Resolved identity:`, {
    id: meData.data?.user?.id,
    email: meData.data?.user?.email,
    role: meData.data?.user?.role,
    capabilities: meData.data?.user?.capabilities,
  });

  // 4. Role-specific route access verification
  console.log(`4. Verifying role-specific authorizations...`);
  if (acc.role === "admin") {
    // Admin can access audit log
    const auditRes = await fetch(`${baseUrl}/api/v1/admin/audit?limit=5`, {
      headers: { Cookie: cookieHeader },
    });
    console.log(`   Admin audit access status: ${auditRes.status} (Expected 200)`);
    if (auditRes.status !== 200) {
      throw new Error(`Admin audit access failed: ${auditRes.status}`);
    }
  } else if (acc.role === "media_team") {
    // Media team cannot access admin audit
    const auditRes = await fetch(`${baseUrl}/api/v1/admin/audit?limit=5`, {
      headers: { Cookie: cookieHeader },
    });
    console.log(`   Media team audit access status: ${auditRes.status} (Expected 403 Forbidden)`);
    if (auditRes.status !== 403) {
      throw new Error(`Media team should be 403 on admin audit, got ${auditRes.status}`);
    }
  } else if (acc.role === "customer") {
    // Customer cannot access admin audit
    const auditRes = await fetch(`${baseUrl}/api/v1/admin/audit?limit=5`, {
      headers: { Cookie: cookieHeader },
    });
    console.log(`   Customer audit access status: ${auditRes.status} (Expected 403 Forbidden)`);
    if (auditRes.status !== 403) {
      throw new Error(`Customer should be 403 on admin audit, got ${auditRes.status}`);
    }

    // Customer can access their own devices
    const devicesRes = await fetch(`${baseUrl}/api/v1/devices`, {
      headers: { Cookie: cookieHeader },
    });
    console.log(`   Customer devices access status: ${devicesRes.status} (Expected 200)`);
    if (devicesRes.status !== 200) {
      throw new Error(`Customer devices access failed: ${devicesRes.status}`);
    }
  }

  // 5. Logout verification
  console.log(`5. Testing logout (POST /api/v1/auth/logout)...`);
  const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  console.log(`   Status: ${logoutRes.status}`);
  if (logoutRes.status !== 200) {
    throw new Error(`Logout failed with status ${logoutRes.status}`);
  }

  // 6. Verify session invalidated after logout
  console.log(`6. Verifying session invalidated after logout...`);
  const postLogoutMe = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  console.log(`   Post-logout me status: ${postLogoutMe.status} (Expected 401)`);
  if (postLogoutMe.status !== 401) {
    throw new Error(`Expected 401 post-logout, got ${postLogoutMe.status}`);
  }

  console.log(`✔ All authentication and authorization checks passed for role: ${acc.role.toUpperCase()}`);
}

async function main() {
  for (const acc of accounts) {
    await testAuthForRole(acc);
  }
  console.log("\n========================================================");
  console.log("ALL ROLES (CUSTOMER, MEDIA TEAM, ADMIN) VERIFIED 100%!");
  console.log("========================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
