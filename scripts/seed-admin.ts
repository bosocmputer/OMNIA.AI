/**
 * Seeds the superadmin user.
 * Run: DATABASE_URL=... npx ts-node --project tsconfig.json scripts/seed-admin.ts
 * Safe to run multiple times (upsert — won't overwrite existing password).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const username = process.argv[2] || "superadmin";
  const password = process.argv[3] || "superadmin";

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`User "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({ data: { username, passwordHash, role: "admin" } });
  console.log(`✅ Created user "${username}" with role=admin`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
