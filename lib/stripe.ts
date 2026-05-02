import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  if (process.env.NODE_ENV === "production") {
    console.warn("STRIPE_SECRET_KEY is missing from environment variables.");
  }
}

export const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2023-10-16" as any, // Use a stable version string or the specific one intended
      typescript: true,
    })
  : null;

export default stripe;
