/**
 * supabase/functions/_shared/sentry.ts
 * 
 * Shared Sentry initialization for Supabase Edge Functions.
 */

import * as Sentry from "https://esm.sh/@sentry/deno@8.54.0";

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: Deno.env.get("ENVIRONMENT") || "development",
    // Performance monitoring
    tracesSampleRate: 1.0, 
  });
}

export { Sentry };

/**
 * Helper to wrap Edge Function handlers with Sentry error tracking.
 */
export function withSentry(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("[Sentry] Captured error:", error);
      if (SENTRY_DSN) {
        Sentry.captureException(error);
      }
      throw error;
    }
  };
}
