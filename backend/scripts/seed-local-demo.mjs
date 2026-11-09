#!/usr/bin/env node
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
dotenv.config({ path: join(backendRoot, ".env") });

// ============================================================================
// MANDATORY GUARD CHECKS (Product Owner Requirement)
// ============================================================================
if (process.env.APP_ENV !== "development") {
  process.stderr.write(
    `[GUARD] Refusing execution: APP_ENV must be 'development', got '${process.env.APP_ENV}'.\n`,
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("[GUARD] Refusing execution: DATABASE_URL is not set.\n");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });

async function verifyGuards(client) {
  // 1. Verify actual connected database name
  const dbRes = await client.query("SELECT current_database() AS db_name");
  const actualDb = dbRes.rows[0]?.db_name;
  if (actualDb !== "giftedpro_dev") {
    throw new Error(
      `[GUARD] Connected database is '${actualDb}', strictly required 'giftedpro_dev'. Refusing.`,
    );
  }

  // 2. Verify port and loopback connection
  const connRes = await client.query(
    "SELECT inet_server_addr() AS server_addr, inet_server_port() AS server_port",
  );
  const serverPort = connRes.rows[0]?.server_port;
  const serverAddr = connRes.rows[0]?.server_addr;

  if (serverPort !== null && serverPort !== 5433) {
    throw new Error(
      `[GUARD] Connected server port is '${serverPort}', strictly required '5433'. Refusing.`,
    );
  }

  if (serverAddr !== null && !["127.0.0.1", "::1"].includes(serverAddr)) {
    throw new Error(
      `[GUARD] Connected server address is '${serverAddr}', strictly required loopback. Refusing.`,
    );
  }

  console.log(`[GUARD VERIFIED] Connected to '${actualDb}' on port 5433 via loopback.`);
}

// Deterministic UUIDs for demo data to guarantee idempotency across multiple runs
const DEMO_CATEGORIES = [
  { id: "11111111-c111-4000-8000-000000000001", name: "Action", slug: "action", description: "High-octane action and adventure", displayOrder: 1 },
  { id: "11111111-c111-4000-8000-000000000002", name: "Drama", slug: "drama", description: "Compelling narratives and emotional journeys", displayOrder: 2 },
  { id: "11111111-c111-4000-8000-000000000003", name: "Comedy", slug: "comedy", description: "Laughter and entertaining stories", displayOrder: 3 },
  { id: "11111111-c111-4000-8000-000000000004", name: "Sci-Fi", slug: "sci-fi", description: "Futuristic science fiction and technology", displayOrder: 4 },
  { id: "11111111-c111-4000-8000-000000000005", name: "Swahili Movies", slug: "swahili-movies", description: "Popular movies with Swahili voice translations", displayOrder: 5 },
];

const DEMO_COUNTRIES = [
  { id: "22222222-c222-4000-8000-000000000001", code: "TZ", name: "Tanzania", flagEmoji: "🇹🇿" },
  { id: "22222222-c222-4000-8000-000000000002", code: "KE", name: "Kenya", flagEmoji: "🇰🇪" },
  { id: "22222222-c222-4000-8000-000000000003", code: "UG", name: "Uganda", flagEmoji: "🇺🇬" },
  { id: "22222222-c222-4000-8000-000000000004", code: "US", name: "United States", flagEmoji: "🇺🇸" },
  { id: "22222222-c222-4000-8000-000000000005", code: "NG", name: "Nigeria", flagEmoji: "🇳🇬" },
  { id: "22222222-c222-4000-8000-000000000006", code: "ZA", name: "South Africa", flagEmoji: "🇿🇦" },
];

const DEMO_DJS = [
  { id: "33333333-d333-4000-8000-000000000001", name: "Dennis Afro", stageName: "DJ Afro", slug: "dj-afro", bio: "Legendary voice artist known for dramatic narration.", colorHex: "#E50914" },
  { id: "33333333-d333-4000-8000-000000000002", name: "Smith Mack", stageName: "DJ Smith", slug: "dj-smith", bio: "Renowned translator and energetic action commentator.", colorHex: "#0070F3" },
  { id: "33333333-d333-4000-8000-000000000003", name: "Murphy Black", stageName: "DJ Murphy", slug: "dj-murphy", bio: "Master of comedy and witty dialogue interpretations.", colorHex: "#10B981" },
  { id: "33333333-d333-4000-8000-000000000004", name: "Black Mamba", stageName: "DJ Black", slug: "dj-black", bio: "Deep vocal presence for thrillers and crime sagas.", colorHex: "#8B5CF6" },
];

async function seed() {
  const client = await pool.connect();
  let insertedCounts = {
    categories: 0,
    countries: 0,
    djs: 0,
    content: 0,
    movieEditions: 0,
    contentCategories: 0,
    contentCountries: 0,
    accessPlans: 0,
    planVersions: 0,
    offers: 0,
    devices: 0,
  };

  try {
    await verifyGuards(client);

    // Retrieve system users
    const usersRes = await client.query(
      "SELECT id, email, role FROM users WHERE email IN ('admin@giftedpromovies.com', 'media@giftedpromovies.com', 'tester@giftedpromovies.com')",
    );
    const users = Object.fromEntries(usersRes.rows.map((u) => [u.email, u]));
    const adminUser = users["admin@giftedpromovies.com"];
    const mediaUser = users["media@giftedpromovies.com"];
    const customerUser = users["tester@giftedpromovies.com"];

    if (!adminUser || !mediaUser || !customerUser) {
      throw new Error(
        "[GUARD] Missing required test accounts (admin, media, or customer). Please run provision-local-accounts.mjs first.",
      );
    }

    console.log("[SEED] Verified existing test accounts.");

    await client.query("BEGIN");

    // 1. Seed Categories
    for (const cat of DEMO_CATEGORIES) {
      const res = await client.query(
        `INSERT INTO categories (id, name, slug, description, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (lower(slug)) DO NOTHING
         RETURNING id`,
        [cat.id, cat.name, cat.slug, cat.description, cat.displayOrder],
      );
      if (res.rowCount > 0) insertedCounts.categories++;
    }

    // 2. Seed Countries
    for (const c of DEMO_COUNTRIES) {
      const res = await client.query(
        `INSERT INTO countries (id, code, name, flag_emoji, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (upper(code)) DO NOTHING
         RETURNING id`,
        [c.id, c.code, c.name, c.flagEmoji],
      );
      if (res.rowCount > 0) insertedCounts.countries++;
    }

    // 3. Seed DJ Voice Artists
    for (const dj of DEMO_DJS) {
      const res = await client.query(
        `INSERT INTO dj_voice_artists (id, name, stage_name, slug, bio, color_hex, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (lower(slug)) DO NOTHING
         RETURNING id`,
        [dj.id, dj.name, dj.stageName, dj.slug, dj.bio, dj.colorHex],
      );
      if (res.rowCount > 0) insertedCounts.djs++;
    }

    // 4. Seed Content (Published and in-review movies)
    const DEMO_CONTENT = [
      {
        id: "44444444-c444-4000-8000-000000000001",
        codeId: "GPM-MOV-001",
        contentType: "movie",
        title: "Bongo Secret Agent: Serengeti Strike",
        originalTitle: "Serengeti Strike",
        slug: "bongo-secret-agent-serengeti-strike",
        releaseYear: 2024,
        description: "An elite operative navigates thrilling high-stakes espionage across the East African savannah.",
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60",
        backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status: "published",
        isFeatured: true,
        isTrending: true,
        durationMinutes: 118,
        publishedAt: new Date().toISOString(),
        categories: ["action", "swahili-movies"],
        countries: ["TZ", "KE"],
        editions: [
          { djId: DEMO_DJS[0].id, isDefault: true, isAvailable: true },
          { djId: DEMO_DJS[1].id, isDefault: false, isAvailable: true },
        ],
      },
      {
        id: "44444444-c444-4000-8000-000000000002",
        codeId: "GPM-MOV-002",
        contentType: "movie",
        title: "Kilimanjaro Shadows",
        originalTitle: "Shadows of the Peak",
        slug: "kilimanjaro-shadows",
        releaseYear: 2023,
        description: "A gripping drama surrounding an inheritance conflict and redemption in the foothills of Mount Kilimanjaro.",
        posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
        backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80",
        trailerUrl: null,
        status: "published",
        isFeatured: true,
        isTrending: false,
        durationMinutes: 104,
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        categories: ["drama", "swahili-movies"],
        countries: ["TZ"],
        editions: [
          { djId: DEMO_DJS[2].id, isDefault: true, isAvailable: true },
        ],
      },
      {
        id: "44444444-c444-4000-8000-000000000003",
        codeId: "GPM-MOV-003",
        contentType: "movie",
        title: "Nairobi Cyber Heist",
        originalTitle: "Cyber Matrix Nairobi",
        slug: "nairobi-cyber-heist",
        releaseYear: 2024,
        description: "Tech prodigies attempt a cyber infiltration of a corrupt conglomerate under the bright lights of Nairobi.",
        posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60",
        backdropUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
        trailerUrl: null,
        status: "published",
        isFeatured: false,
        isTrending: true,
        durationMinutes: 125,
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        categories: ["action", "sci-fi"],
        countries: ["KE", "US"],
        editions: [
          { djId: DEMO_DJS[1].id, isDefault: true, isAvailable: true },
        ],
      },
      {
        id: "44444444-c444-4000-8000-000000000004",
        codeId: "GPM-MOV-004",
        contentType: "movie",
        title: "Dar es Salaam Laughs",
        originalTitle: "Comedy at the Coast",
        slug: "dar-es-salaam-laughs",
        releaseYear: 2024,
        description: "A hilarious series of misunderstandings at a coastal beach resort wedding.",
        posterUrl: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=500&auto=format&fit=crop&q=60",
        backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80",
        trailerUrl: null,
        status: "pending_review",
        isFeatured: false,
        isTrending: false,
        durationMinutes: 92,
        publishedAt: null,
        categories: ["comedy", "swahili-movies"],
        countries: ["TZ"],
        editions: [
          { djId: DEMO_DJS[2].id, isDefault: true, isAvailable: false },
        ],
      },
    ];

    for (const item of DEMO_CONTENT) {
      const res = await client.query(
        `INSERT INTO content (
          id, code_id, content_type, title, original_title, slug,
          release_year, description, poster_url, backdrop_url, trailer_url,
          status, is_featured, is_trending, duration_minutes,
          created_by, submitted_by, approved_by, published_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19
        )
        ON CONFLICT (lower(slug)) DO NOTHING
        RETURNING id`,
        [
          item.id, item.codeId, item.contentType, item.title, item.originalTitle, item.slug,
          item.releaseYear, item.description, item.posterUrl, item.backdropUrl, item.trailerUrl,
          item.status, item.isFeatured, item.isTrending, item.durationMinutes,
          mediaUser.id,
          item.status !== "draft" ? mediaUser.id : null,
          item.status === "published" ? adminUser.id : null,
          item.publishedAt,
        ],
      );
      if (res.rowCount > 0) insertedCounts.content++;

      // Taxonomies mapping
      for (const catSlug of item.categories) {
        const cat = DEMO_CATEGORIES.find((c) => c.slug === catSlug);
        if (cat) {
          const mapRes = await client.query(
            `INSERT INTO content_categories (content_id, category_id)
             VALUES ($1, $2)
             ON CONFLICT (content_id, category_id) DO NOTHING`,
            [item.id, cat.id],
          );
          if (mapRes.rowCount > 0) insertedCounts.contentCategories++;
        }
      }

      for (const countryCode of item.countries) {
        const country = DEMO_COUNTRIES.find((c) => c.code === countryCode);
        if (country) {
          const mapRes = await client.query(
            `INSERT INTO content_countries (content_id, country_id)
             VALUES ($1, $2)
             ON CONFLICT (content_id, country_id) DO NOTHING`,
            [item.id, country.id],
          );
          if (mapRes.rowCount > 0) insertedCounts.contentCountries++;
        }
      }

      // Editions mapping
      for (const ed of item.editions) {
        const edRes = await client.query(
          `INSERT INTO movie_editions (movie_id, dj_id, is_default, is_available)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (movie_id, dj_id) DO NOTHING
           RETURNING id`,
          [item.id, ed.djId, ed.isDefault, ed.isAvailable],
        );
        if (edRes.rowCount > 0) insertedCounts.movieEditions++;
      }
    }

    // 5. Seed Commercial Access Plans, Versions & Offers
    const DEMO_PLANS = [
      {
        id: "55555555-5555-4000-8000-000000000001",
        code: "SVOD_MONTHLY_VIP",
        name: "Monthly VIP Pass",
        version: {
          id: "66666666-6666-4000-8000-000000000001",
          versionNumber: 1,
          durationValue: 30,
          durationUnit: "DAY",
          downloadLimit: 50,
          downloadLimitType: "UNIQUE_TITLES",
          deviceLimit: 3,
          concurrentStreamLimit: 1,
        },
        offer: {
          id: "77777777-7777-4000-8000-000000000001",
          code: "OFFER_VIP_30D",
          name: "Full VIP All-Access Subscription",
          status: "active",
          startsAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          targetKind: "CATALOG",
          catalogPolicyType: "ALL_CATALOG",
          priceTzs: 15000,
        },
      },
      {
        id: "55555555-5555-4000-8000-000000000002",
        code: "TVOD_RENTAL_48H",
        name: "Pay-Per-View Movie Rental",
        version: {
          id: "66666666-6666-4000-8000-000000000002",
          versionNumber: 1,
          durationValue: 48,
          durationUnit: "HOUR",
          downloadLimit: 1,
          downloadLimitType: "DOWNLOAD_ACTIONS",
          deviceLimit: 2,
          concurrentStreamLimit: 1,
        },
        offer: {
          id: "77777777-7777-4000-8000-000000000002",
          code: "OFFER_RENTAL_SERENGETI",
          name: "Serengeti Strike 48-Hour Rental",
          status: "active",
          startsAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          targetKind: "MOVIE",
          targetMovieContentId: DEMO_CONTENT[0].id,
          priceTzs: 3000,
        },
      },
    ];

    for (const plan of DEMO_PLANS) {
      const planRes = await client.query(
        `INSERT INTO access_plans (id, code, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [plan.id, plan.code, plan.name],
      );
      if (planRes.rowCount > 0) insertedCounts.accessPlans++;

      const verRes = await client.query(
        `INSERT INTO plan_versions (
          id, access_plan_id, version_number, duration_value, duration_unit,
          download_limit, download_limit_type, device_limit, concurrent_stream_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (access_plan_id, version_number) DO NOTHING
        RETURNING id`,
        [
          plan.version.id, plan.id, plan.version.versionNumber,
          plan.version.durationValue, plan.version.durationUnit,
          plan.version.downloadLimit, plan.version.downloadLimitType,
          plan.version.deviceLimit, plan.version.concurrentStreamLimit,
        ],
      );
      if (verRes.rowCount > 0) insertedCounts.planVersions++;

      const offerRes = await client.query(
        `INSERT INTO offers (
          id, code, name, status, starts_at, target_kind,
          target_movie_content_id, plan_version_id, price_tzs, catalog_policy_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (code) DO NOTHING
        RETURNING id`,
        [
          plan.offer.id, plan.offer.code, plan.offer.name, plan.offer.status,
          plan.offer.startsAt, plan.offer.targetKind,
          plan.offer.targetMovieContentId ?? null,
          plan.version.id, plan.offer.priceTzs,
          plan.offer.catalogPolicyType ?? null,
        ],
      );
      if (offerRes.rowCount > 0) insertedCounts.offers++;
    }

    // 6. Seed a registered device for customer
    const devRes = await client.query(
      `INSERT INTO devices (id, user_id, device_identifier, device_name, device_type)
       VALUES ('88888888-d888-4000-8000-000000000001', $1, 'macbook-dev-01', 'MacBook Air - Local Chrome', 'desktop')
       ON CONFLICT (user_id, device_identifier) DO NOTHING
       RETURNING id`,
      [customerUser.id],
    );
    if (devRes.rowCount > 0) insertedCounts.devices++;

    // 7. Record an audit log for the seeding event
    await client.query(
      `INSERT INTO audit_events (
        actor_id, action, resource_type, resource_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        adminUser.id,
        "system.local_demo_seeded",
        "system",
        "giftedpro_dev",
        JSON.stringify({ insertedCounts, appEnv: "development" }),
      ],
    );

    await client.query("COMMIT");

    console.log("\n========================================================");
    console.log("DEMO SEEDING EXECUTION COMPLETED SUCCESSFULLY");
    console.log("========================================================");
    console.log(`Categories inserted:         ${insertedCounts.categories}`);
    console.log(`Countries inserted:          ${insertedCounts.countries}`);
    console.log(`DJ Artists inserted:         ${insertedCounts.djs}`);
    console.log(`Content items inserted:      ${insertedCounts.content}`);
    console.log(`Movie Editions inserted:     ${insertedCounts.movieEditions}`);
    console.log(`Content Categories mapped:   ${insertedCounts.contentCategories}`);
    console.log(`Content Countries mapped:    ${insertedCounts.contentCountries}`);
    console.log(`Access Plans inserted:       ${insertedCounts.accessPlans}`);
    console.log(`Plan Versions inserted:      ${insertedCounts.planVersions}`);
    console.log(`Commercial Offers inserted:  ${insertedCounts.offers}`);
    console.log(`Registered Devices inserted: ${insertedCounts.devices}`);
    console.log("========================================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    process.stderr.write(`[ERROR] Seeding failed, transaction rolled back: ${err.message}\n`);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
