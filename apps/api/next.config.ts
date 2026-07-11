import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@lifeos/contracts", "@lifeos/domain"],
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
