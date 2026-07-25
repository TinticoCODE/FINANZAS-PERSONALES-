import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default withSerwist(nextConfig);
