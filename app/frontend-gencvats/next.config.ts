import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.110.163", "localhost", "127.0.0.1", "fungistatic-luanna-aphylly.ngrok-free.dev"],
  typedRoutes: true,
};

export default nextConfig;

