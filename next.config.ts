import type { NextConfig } from "next";
import legacyArtUrls from "./public/art-packs/legacy-urls.json";

export const legacyArtRewrites = Object.entries(legacyArtUrls).map(
  ([source, destination]) => ({ source, destination }),
);

const nextConfig: NextConfig = {
  transpilePackages: ["@lifeos/contracts", "@lifeos/domain"],
  images: {
    remotePatterns: [
      // Vercel Blob — used when BLOB_READ_WRITE_TOKEN is set in production.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: legacyArtRewrites,
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
