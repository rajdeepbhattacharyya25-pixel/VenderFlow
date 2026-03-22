import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <ThemeProvider attribute="class">
    <div style={{ background: 'white', color: 'black', padding: '50px', fontSize: '24px', fontFamily: 'sans-serif' }}>
      <h1>ThemeProvider Debug Mode</h1>
      <p>If you see this, ThemeProvider is working.</p>
    </div>
  </ThemeProvider>
);