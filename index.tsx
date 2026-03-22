import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from 'next-themes';
import './instrument'; // Sentry initialization

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const rootOptions = {
  onUncaughtError: (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("React Uncaught Error:", error, errorInfo);
  },
  onCaughtError: (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("React Caught Error:", error, errorInfo);
  },
  onRecoverableError: (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("React Recoverable Error:", error, errorInfo);
  }
};

const root = ReactDOM.createRoot(rootElement, rootOptions);

root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);