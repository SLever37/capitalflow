import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';

console.log('CapitalFlow: Booting main.tsx...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("CapitalFlow: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
console.log('CapitalFlow: Render initiated.');
