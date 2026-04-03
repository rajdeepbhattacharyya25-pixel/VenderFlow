/**
 * supabase/functions/_shared/cors.ts
 *
 * Shared CORS configuration for Edge Functions.
 * Centralizing this ensures that all functions handle preflight requests (OPTIONS)
 * and allow the necessary headers (including tracing headers like baggage/sentry-trace).
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sentry-trace, baggage, x-sentry-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Helper to wrap responses with CORS headers.
 */
export function withCors(response: Response): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Helper to handle OPTIONS requests.
 */
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
