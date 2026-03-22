import './instrument';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ThemeProvider } from 'next-themes';

const rootElement = document.getElementById('root');
console.log('Mounting VenderFlow Application...', { rootElement });
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// React 19 error handlers (Late-bound to Sentry once initialized)
const rootOptions = {
    onUncaughtError: (error: Error, errorInfo: React.ErrorInfo) => {
        (window as unknown as { Sentry?: { captureException: (error: Error, options: object) => void } }).Sentry?.captureException(error, { extra: errorInfo });
    },
    onCaughtError: (error: Error, errorInfo: React.ErrorInfo) => {
        (window as unknown as { Sentry?: { captureException: (error: Error, options: object) => void } }).Sentry?.captureException(error, { extra: errorInfo });
    },
    onRecoverableError: (error: Error, errorInfo: React.ErrorInfo) => {
        (window as unknown as { Sentry?: { captureException: (error: Error, options: object) => void } }).Sentry?.captureException(error, { extra: errorInfo });
    },
};

const root = ReactDOM.createRoot(rootElement, rootOptions);

root.render(
    <div style={{ background: 'white', color: 'black', padding: '50px', fontSize: '24px' }}>
      VenderFlow Debug Mode: Is this rendering?
    </div>
);