// Imports a JSON backup of the old Postgres database into the LOCAL D1 database (.wrangler/state).
// Usage: node scripts/import-pg-backup.mjs <backup.json>
// For the remote database, export the local one afterwards:
//   npx wrangler d1 export dwt --local --no-schema --output dump.sql
//   npx wrangler d1 execute dwt --remote --file dump.sql
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { getPlatformProxy } from "wrangler";

const req = createRequire(import.meta.url);
const { PrismaClient } = req("@prisma/client");
const { PrismaD1 } = req("@prisma/adapter-d1");

const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/import-pg-backup.mjs <backup.json>");
const backup = JSON.parse(readFileSync(file, "utf8"));

const DATE_FIELDS = new Set(["createdAt", "updatedAt", "approvedAt", "checkedInAt", "tourDate"]);
const revive = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, DATE_FIELDS.has(k) && v ? new Date(v) : v]));

const { env, dispose } = await getPlatformProxy();
const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });

// Parents first so foreign keys are satisfied
for (const model of ["user", "tour", "closedDeparture", "voucher", "voucherCounter", "appSetting"]) {
  const rows = backup[model] ?? [];
  for (const row of rows) await prisma[model].create({ data: revive(row) });
  console.log(`${model}: imported ${rows.length}`);
}

await prisma.$disconnect();
await dispose();
