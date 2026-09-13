import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { offerAppUpdate } from './lib/appUpdates';
import './styles.css';

// Updates wait for an explicit refresh, so an active consultation is never interrupted.
const updateServiceWorker = registerSW({
  onNeedRefresh() {
    offerAppUpdate(() => updateServiceWorker(true));
  },
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new Event('portfolio-offline-ready'));
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    let lastCheck = 0;
    const checkForUpdate = () => {
      if (!navigator.onLine || document.visibilityState === 'hidden') return;
      if (Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      registration.update().catch(() => {});
    };
    checkForUpdate();
    window.addEventListener('online', checkForUpdate);
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', checkForUpdate);
    setInterval(checkForUpdate, 15 * 60 * 1000);
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
