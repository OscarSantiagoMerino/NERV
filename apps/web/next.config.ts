import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // agent-core is a workspace package shipped as TypeScript source.
  transpilePackages: ["agent-core"],
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
