import { signOut } from "@/auth";

// Clears a stale session (e.g. the account was rejected after login) and returns to the login page.
export async function GET() {
  await signOut({ redirectTo: "/auth/login" });
}
