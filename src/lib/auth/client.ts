"use client";
import { createAuthClient } from "@neon/auth/next";

/* Talks to /api/auth, which forwards to Neon Auth. */
let client: ReturnType<typeof createAuthClient> | null = null;
export const authClient = () => (client ??= createAuthClient());
