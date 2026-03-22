export const initSentry = async () => {
  if ((window as any).SENTRY_INITIALIZED) return;
  (window as any).SENTRY_INITIALIZED = true;
  
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  if (!SENTRY_DSN) {
    console.warn("Sentry DSN not found. Monitoring is disabled.");
    return;
  }

  // Dynamically import Sentry to keep it out of the main bundle
  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, 
    tracePropagationTargets: ["localhost", /^https:\/\/gqwgvhxcssooxbmwgiwt\.supabase\.co/],
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    denyUrls: [
      /extensions\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^graph:\/\//i,
      /localhost:\d+\/assets\//i,
    ],
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
      }),
    ],
  });

  // Export Sentry to window for the error handlers to use
  (window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry;

  // Debug helper to verify status in production console
  (window as unknown as { SENTRY_STATUS: object }).SENTRY_STATUS = {
      initialized: true,
      dsn_exists: !!SENTRY_DSN,
      env: import.meta.env.MODE,
      prod: import.meta.env.PROD
  };
};

// Auto-init if not in a server environment
if (typeof window !== 'undefined') {
    // initSentry();
}
