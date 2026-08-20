import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.110.163", "localhost", "127.0.0.1"],
  typedRoutes: true,
};

export default nextConfig;

