import { Global, Module } from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { DATABASE_POOL, DRIZZLE_DATABASE } from "./database.tokens.js";
import { DatabaseService } from "./database.service.js";
import * as schema from "./schemas/index.js";

export type ApplicationDatabase = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ENVIRONMENT_CONFIG],
      useFactory: (config: EnvironmentConfig): Pool =>
        new Pool({
          connectionString: config.databaseUrl,
          max: config.databasePoolMax,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 30_000,
          allowExitOnIdle: false,
        }),
    },
    {
      provide: DRIZZLE_DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): ApplicationDatabase => drizzle(pool, { schema }),
    },
    DatabaseService,
  ],
  exports: [DATABASE_POOL, DRIZZLE_DATABASE, DatabaseService],
})
export class DatabaseModule {}
