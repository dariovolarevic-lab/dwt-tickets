import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@prisma/client", ".prisma/client"],
};

// Gives `next dev` the local D1 binding (stored in .wrangler/state)
initOpenNextCloudflareForDev();

export default nextConfig;
