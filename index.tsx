console.log("[VenderFlow] index.tsx execution started");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
console.log("[VenderFlow] Imports completed");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("[VenderFlow] FATAL: Could not find root element");
  throw new Error("Could not find root element to mount to");
}

console.log("[VenderFlow] Creating React root...");
const root = ReactDOM.createRoot(rootElement);

console.log("[VenderFlow] Starting initial render...");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("[VenderFlow] root.render() called");