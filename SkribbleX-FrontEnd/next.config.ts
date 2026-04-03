import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.istockphoto.com" },
    ],
  },

  trailingSlash: true,

  assetPrefix:
    process.env.NODE_ENV === "production"
      ? "https://skribblex.sfalter.de"
      : undefined,
};

export default nextConfig;
