import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import bcrypt from "bcrypt";
import prisma from "@/prisma/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // OTP verification handled by emailOTP plugin
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
    async sendResetPasswordEmail(data: { user: any; url: string }) {
      const { user, url } = data;
      try {
        console.log(`[AUTH] Password reset requested for ${user.email}`);
        console.log(`[AUTH] Reset Link: ${url}`);
      } catch (err) {
        console.error("[AUTH] Error in sendResetPasswordEmail callback:", err);
      }
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification" || type === "sign-in") {
          try {
            const { sendOTPEmail } = await import("./email");
            console.log(`[AUTH] Sending OTP ${otp} to ${email}`);
            await sendOTPEmail({
              to: email,
              name: email.split("@")[0] || "User",
              otp,
            });
            console.log(`[AUTH] OTP sent successfully to ${email}`);
          } catch (err) {
            console.error("[AUTH] Error sending OTP:", err);
          }
        }
      },
      overrideDefaultEmailVerification: true,
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
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
    "http://127.0.0.1:3000",
  ].filter((o): o is string => !!o),
});
