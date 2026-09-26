import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Keep the demo build separate so a running dev server cannot overwrite it.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  devIndicators: false,
  experimental: {
    // Reuse client-cached dynamic pages for 30s so switching dashboard tabs doesn't re-render on the server.
    // Mutations that must show immediately call router.refresh() / revalidatePath().
    staleTimes: { dynamic: 30, static: 30 },
  },
};

export default nextConfig;
