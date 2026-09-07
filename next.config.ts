import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["terminal.local"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "baseec-img-mng.akamaized.net",
        pathname: "/images/item/**",
      },
      {
        protocol: "https",
        hostname: "udjpqsmihauksbceaxww.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
