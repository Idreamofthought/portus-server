import Stripe from "stripe";

// Preserve the API contract used before upgrading stripe-node.
export const STRIPE_API_VERSION = "2024-06-20";

export function createStripeClient(key, options = {}) {
  return new Stripe(key, { ...options, apiVersion: STRIPE_API_VERSION });
}
