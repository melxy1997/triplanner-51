import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@triplanner/core", "@triplanner/renderer-canvas"],
};

export default nextConfig;
