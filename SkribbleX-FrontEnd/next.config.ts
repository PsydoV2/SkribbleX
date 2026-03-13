import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "media.istockphoto.com" },
      // Discord CDN später hinzufügen:
      // { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
