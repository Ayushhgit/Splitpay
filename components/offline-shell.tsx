'use client';

import { useEffect } from 'react';

/**
 * Registers the offline shell, in production only — in development the service
 * worker would sit in front of the dev server and serve stale chunks.
 */
export function OfflineShell() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // No offline shell this session. The app still works online.
      });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
