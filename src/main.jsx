import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { offerAppUpdate } from './lib/appUpdates';
import './styles.css';

// The worker can activate while an old tab is open. Offer a page refresh without
// interrupting a consultation, including updates installed by another window.
if ('serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) offerAppUpdate(() => window.location.reload());
    hadController = true;
  });
}
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
