import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const isSentryInitialized = !!SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/gqwgvhxcssooxbmwgiwt\.supabase\.co/],

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable PII data collection
    sendDefaultPii: false, // Security: Disabled PII by default

    // Ignore noisy errors from browser extensions and local files
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
} else {
  console.warn("Sentry DSN not found. Monitoring is disabled.");
}

// Debug helper to verify status in production console
(window as any).SENTRY_STATUS = {
    initialized: isSentryInitialized,
    dsn_exists: !!SENTRY_DSN,
    env: import.meta.env.MODE,
    prod: import.meta.env.PROD
};
