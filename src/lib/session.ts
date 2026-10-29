import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// JWTs can outlive a status change, so re-check the user in the database.
export async function requireUser(role: "ADMIN" | "PARTNER") {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, status: true, agencyName: true },
  });
  if (!user || user.status !== "APPROVED" || user.role !== role) redirect("/api/logout");

  return user;
}

// For route handlers: returns the approved user with the given role, or null (no redirects)
export async function getApiUser(role: "ADMIN" | "PARTNER") {
  const session = await auth();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true },
  });
  return user && user.status === "APPROVED" && user.role === role ? user : null;
}
