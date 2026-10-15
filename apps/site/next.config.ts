import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 0: CI builds only — no deploy target is wired (owner directive 2026-10-15).
  transpilePackages: ["@zynoa/tokens"],
};

export default nextConfig;
