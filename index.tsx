import { isSentryInitialized } from './instrument';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';

import { ThemeProvider } from 'next-themes';

const rootElement = document.getElementById('root');
console.log('Mounting VenderFlow Application...', { rootElement });
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const rootOptions = isSentryInitialized ? {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
} : {};

const root = ReactDOM.createRoot(rootElement, rootOptions);

root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);