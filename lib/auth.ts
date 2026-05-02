import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/prisma/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      minLength: 8,
      maxLength: 128,
    },
    async sendResetPasswordEmail(data) {
      const { user, url } = data;
      console.log(`[AUTH] Password reset requested for ${user.email}`);
      console.log(`[AUTH] Reset Link: ${url}`);
      // In production, you would use a mailer like Resend or Nodemailer here
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // NOTE: Ensure your Authorized Redirect URI in Google Cloud Console is exactly:
      // http://localhost:3000/api/auth/callback/google
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh daily
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: true,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
      timezone: {
        type: "string",
        defaultValue: "UTC",
        input: true,
      },
      deletedAt: {
        type: "date",
        defaultValue: null,
        input: false,
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000",
  ].filter((o): o is string => !!o),
});
