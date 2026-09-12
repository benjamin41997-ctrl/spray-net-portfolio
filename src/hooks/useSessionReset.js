import { useEffect } from 'react';
import { navigate } from '../lib/navigation';

export function useSessionReset(minutes, onReset) {
  useEffect(() => {
    if (!(minutes > 0)) return;
    let lastActivity = Date.now();
    let timer;
    const limit = minutes * 60_000;
    const check = () => {
      clearTimeout(timer);
      const remaining = limit - (Date.now() - lastActivity);
      if (remaining <= 0) {
        lastActivity = Date.now();
        navigate('/', { replace: true });
        onReset();
      }
      timer = setTimeout(check, Math.max(100, remaining > 0 ? remaining : limit));
    };
    const activity = () => {
      lastActivity = Date.now();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    // Do not interrupt a homeowner watching a video. Local playback extends the session.
    document.addEventListener('timeupdate', activity, true);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, activity));
      document.removeEventListener('timeupdate', activity, true);
      document.removeEventListener('visibilitychange', check);
    };
  }, [minutes, onReset]);
}
