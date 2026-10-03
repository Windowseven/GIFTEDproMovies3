import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { sql } from "drizzle-orm";
import { DATABASE_POOL, DRIZZLE_DATABASE } from "./database.tokens.js";

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DATABASE) readonly drizzle: NodePgDatabase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async checkReadiness(): Promise<void> {
    await this.drizzle.execute(sql`SELECT 1`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
