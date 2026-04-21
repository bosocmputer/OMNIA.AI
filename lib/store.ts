/**
 * Storage layer entry point.
 * Routes and other code should import from here, not from agents-store.ts directly.
 * Switches to Postgres implementation when DATABASE_URL is set.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export * from "@/lib/agents-store";
