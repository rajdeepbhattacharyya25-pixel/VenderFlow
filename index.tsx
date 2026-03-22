import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <div style={{ background: 'white', color: 'black', padding: '50px', fontSize: '24px', fontFamily: 'sans-serif' }}>
      <h1>VenderFlow Ultra-Minimal Debug Mode</h1>
      <p>If you see this, the core React mount is working.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
);