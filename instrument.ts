import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/gqwgvhxcssooxbmwgiwt\.supabase\.co/],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable PII data collection
  sendDefaultPii: true,

  // Ignore noisy errors from browser extensions
  denyUrls: [
    /extensions\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
    }),
  ],
});
