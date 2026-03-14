import type { NextConfig } from "next";

// Discord proxies Activity iframes through /.proxy/
// All asset URLs must include this prefix so _next/static/... loads correctly.
const DISCORD_PROXY = process.env.NEXT_PUBLIC_DISCORD_PROXY ?? "/.proxy";

const nextConfig: NextConfig = {
  output: "export",

  // In production inside Discord, assets must be prefixed with /.proxy/
  // so Discord's proxy can serve them. In local dev this is empty.
  assetPrefix: DISCORD_PROXY,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.istockphoto.com" },
    ],
  },

  trailingSlash: true,
};

export default nextConfig;
