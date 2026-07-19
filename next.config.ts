import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Les paquets uniquement serveur ne doivent pas être bundlés côté client.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
