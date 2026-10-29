import type { Prisma } from "@prisma/client";

// Tour.departureTimes is stored as JSON (SQLite has no array type); this returns it as a clean string[].
export function timesOf(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : [];
}
