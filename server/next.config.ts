import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This project is API-only (no pages/UI). All routes live under
  // src/app/api/**. CORS is handled per-route via lib/utils/response.ts
  // so the Vite frontend (different origin) can call these endpoints.
};

export default nextConfig;
