import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { HelmetProvider } from 'react-helmet-async';
import { initAnalytics } from './utils/analytics';

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

registerSW({ immediate: true });

// Register custom service worker for background audio
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Custom SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('Custom SW registration failed: ', registrationError);
      });
  });
}

// Initialize Google Analytics (GA4)
initAnalytics();

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);