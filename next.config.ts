import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    ".prisma",
    "@prisma/client-user",
    "@prisma/client-cache"
  ]
};

export default nextConfig;
