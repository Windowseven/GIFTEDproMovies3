import { pgEnum } from "drizzle-orm/pg-core";

export const contentTypeEnum = pgEnum("content_type", [
  "movie",
  "series",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending_review",
  "published",
  "unpublished",
  "archived",
]);

export const episodeStatusEnum = pgEnum("episode_status", [
  "draft",
  "published",
  "archived",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);
