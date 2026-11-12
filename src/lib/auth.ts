import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

const baseURL = process.env.BETTER_AUTH_URL || process.env.SITE_URL || "http://localhost:3000";

export const auth = betterAuth({
  appName: "Isaac Nyamari",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL, process.env.SITE_URL].filter(Boolean) as string[],
  database: prismaAdapter(db, { provider: "postgresql" }),
  user: {
    modelName: "adminUser",
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "ADMIN", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Administrators are provisioned from the CLI only; there is no public registration.
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: baseURL.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
