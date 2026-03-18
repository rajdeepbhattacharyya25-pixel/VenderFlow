import './instrument';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';

import { ThemeProvider } from 'next-themes';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement, {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);