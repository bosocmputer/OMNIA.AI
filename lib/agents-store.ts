/**
 * Storage layer. When DATABASE_URL is set, uses Postgres (agents-store-db.ts).
 * Falls back to JSON file storage (agents-store-json.ts) when no DB is configured.
 *
 * All routes import from here — they get the correct implementation automatically.
 */
export * from "./agents-store-db";
