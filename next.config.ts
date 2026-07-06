import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma",
    "@prisma/client-user",
    "@prisma/client-cache"
  ]
};

export default nextConfig;
