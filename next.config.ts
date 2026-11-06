import type { NextConfig } from 'next';

/* Cloud mode needs the Neon database and Neon Auth; without them the studio runs in demo mode. */
const cloud =
  !!process.env.DATABASE_URL &&
  !!process.env.NEON_AUTH_BASE_URL &&
  (process.env.NEON_AUTH_COOKIE_SECRET || '').length >= 32;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_CLOUD: cloud ? '1' : '' },
  // Product photos are sent through a server function; shrunk photos stay well under this.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
};

export default nextConfig;
