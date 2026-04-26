import { useEffect } from 'react';

export default function usePolling(callback, intervalMs, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof callback !== 'function' || !intervalMs) return undefined;

    let timer = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const tick = () => {
      callback();
    };

    const start = () => {
      if (document.hidden) return;
      stop();
      tick();
      timer = setInterval(tick, intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [callback, intervalMs, enabled]);
}
