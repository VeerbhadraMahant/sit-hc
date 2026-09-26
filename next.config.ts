import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse client-cached dynamic pages for 30s so switching dashboard tabs doesn't re-render on the server.
    // Mutations that must show immediately call router.refresh() / revalidatePath().
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
