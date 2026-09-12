import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// A new version waits until all app windows close, avoiding mid-consultation reloads.
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new Event('portfolio-offline-ready'));
  },
  onRegisteredSW(_url, registration) {
    if (registration)
      setInterval(
        () => {
          if (navigator.onLine) registration.update().catch(() => {});
        },
        60 * 60 * 1000,
      );
  },
  onRegisterError(error) {
    console.warn('Offline setup did not finish. Reopen online to retry.', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
