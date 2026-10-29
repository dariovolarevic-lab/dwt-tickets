import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / bcrypt) shared with the middleware.
export const authConfig = {
  pages: { signIn: "/auth/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const user = auth?.user;
      const isApproved = user?.status === "APPROVED";

      if (pathname.startsWith("/auth")) {
        if (user && isApproved) {
          const home = user.role === "ADMIN" ? "/admin" : "/partner";
          return Response.redirect(new URL(home, nextUrl));
        }
        return true;
      }
      if (pathname.startsWith("/admin")) {
        return isApproved && user?.role === "ADMIN";
      }
      if (pathname.startsWith("/partner")) {
        return isApproved && user?.role === "PARTNER";
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.agencyName = user.agencyName;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "PARTNER";
      session.user.status = token.status as "PENDING" | "APPROVED" | "REJECTED";
      session.user.agencyName = token.agencyName as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
