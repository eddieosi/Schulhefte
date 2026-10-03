import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker and enable auto-update notification
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('Schulhefte ist offline einsatzbereit');
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);

      // Check for updates when app comes back to foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    }
  },
});

// Expose update functions globally
(window as any).__updatePWA = updateSW;

createRoot(document.getElementById('root')!).render(<App />);
