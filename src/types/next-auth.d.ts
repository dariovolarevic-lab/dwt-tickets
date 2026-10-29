import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "PARTNER";
type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

declare module "next-auth" {
  interface User {
    role: AppRole;
    status: AppStatus;
    agencyName: string;
  }
  interface Session {
    user: {
      id: string;
      role: AppRole;
      status: AppStatus;
      agencyName: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    status?: AppStatus;
    agencyName?: string;
  }
}
