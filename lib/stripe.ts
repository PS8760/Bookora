/**
 * Stripe Payment Integration
 * Handles payment processing, checkout sessions, and webhooks
 */

import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
}

// Initialize Stripe with secret key
export const stripe = stripeKey 
  ? new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    })
  : null;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCheckoutSessionParams {
  bookingId: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  serviceTitle: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerEmail: string;
  bookingId: string;
  metadata?: Record<string, string>;
}

// ─── Checkout Session ─────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session for booking payment
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const {
    bookingId,
    amount,
    currency = "inr",
    customerEmail,
    customerName,
    serviceTitle,
    successUrl,
    cancelUrl,
    metadata = {},
  } = params;

  try {
    // Determine payment methods based on currency
    const paymentMethodTypes = currency.toLowerCase() === "inr" 
      ? ["card", "upi"] // For INR, support both card and UPI
      : ["card"]; // For other currencies, only card

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: serviceTitle,
              description: `Booking payment for ${serviceTitle}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents/paise
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: bookingId,
      metadata: {
        bookingId,
        customerName,
        ...metadata,
      },
      payment_intent_data: {
        metadata: {
          bookingId,
          customerName,
          ...metadata,
        },
      },
    });

    return session;
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    throw new Error("Failed to create payment session");
  }
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Failed to retrieve checkout session:", error);
    throw new Error("Failed to retrieve payment session");
  }
}

// ─── Payment Intent ───────────────────────────────────────────────────────────

/**
 * Create a Payment Intent (for custom payment flows)
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<Stripe.PaymentIntent> {
  const { amount, currency = "inr", customerEmail, bookingId, metadata = {} } = params;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents/paise
      currency: currency.toLowerCase(),
      receipt_email: customerEmail,
      metadata: {
        bookingId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Failed to create payment intent:", error);
    throw new Error("Failed to create payment intent");
  }
}

/**
 * Retrieve a payment intent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error("Failed to retrieve payment intent:", error);
    throw new Error("Failed to retrieve payment intent");
  }
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * Create a refund for a payment
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: "duplicate" | "fraudulent" | "requested_by_customer"
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
      reason,
    });

    return refund;
  } catch (error) {
    console.error("Failed to create refund:", error);
    throw new Error("Failed to process refund");
  }
}

/**
 * Retrieve a refund by ID
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund> {
  try {
    return await stripe.refunds.retrieve(refundId);
  } catch (error) {
    console.error("Failed to retrieve refund:", error);
    throw new Error("Failed to retrieve refund");
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  userId: string
): Promise<Stripe.Customer> {
  try {
    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
  } catch (error) {
    console.error("Failed to get or create customer:", error);
    throw new Error("Failed to process customer");
  }
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

/**
 * Verify and construct a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Format amount from cents/paise to currency units
 */
export function formatAmount(amountInCents: number, currency: string = "INR"): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Convert currency units to cents/paise
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents/paise to currency units
 */
export function fromCents(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Get payment status from Stripe payment intent status
 */
export function getPaymentStatus(
  status: Stripe.PaymentIntent.Status
): "PENDING" | "PAID" | "FAILED" | "REFUNDED" {
  switch (status) {
    case "succeeded":
      return "PAID";
    case "processing":
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
      return "PENDING";
    case "canceled":
    case "requires_capture":
      return "FAILED";
    default:
      return "PENDING";
  }
}

/**
 * Check if webhook event is valid
 */
export function isValidWebhookEvent(event: Stripe.Event): boolean {
  return event && event.type && event.data && event.data.object;
}
