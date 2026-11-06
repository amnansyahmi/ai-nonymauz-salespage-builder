/* Cloud mode is on when the server has a Neon database and Neon Auth configured (set at build time in next.config).
   Without it the app runs in demo mode: pages live in this browser and publishing is off. */
export const hasCloud = process.env.NEXT_PUBLIC_CLOUD === "1";
