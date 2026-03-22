console.log("[VenderFlow] index.tsx execution started");
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from 'next-themes';
console.log("[VenderFlow] Imports completed");

const rootElement = document.getElementById('root');
console.log("[VenderFlow] Root element check:", !!rootElement);

if (!rootElement) {
  console.error("[VenderFlow] FATAL: Could not find root element");
  throw new Error("Could not find root element to mount to");
}

console.log("[VenderFlow] Creating React root...");
try {
  const root = ReactDOM.createRoot(rootElement);
  console.log("[VenderFlow] React root created successfully");

  console.log("[VenderFlow] Starting initial render...");
  root.render(
    <React.StrictMode>
      <ThemeProvider attribute="class" enableSystem={false} defaultTheme="dark">
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
  console.log("[VenderFlow] root.render() called");
} catch (error) {
  console.error("[VenderFlow] Rendering failed immediately:", error);
}