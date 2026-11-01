import { useEffect, useRef } from 'react';

// Deliberate hidden gesture; operator API credentials still authorize custom edits.
export function useOperatorUnlock(onUnlock) {
  const hold = useRef(null);
  const taps = useRef([]);
  const fired = useRef(false);
  const startPoint = useRef(null);
  const stop = () => { clearTimeout(hold.current); hold.current = null; startPoint.current = null; };
  useEffect(() => stop, []);
  return {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) return;
      stop(); fired.current = false; startPoint.current = {x:event.clientX,y:event.clientY};
      hold.current = setTimeout(() => { fired.current = true; taps.current = []; onUnlock(); }, 5000);
    },
    onPointerMove(event) { if (startPoint.current && Math.hypot(event.clientX-startPoint.current.x,event.clientY-startPoint.current.y)>16) stop(); },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu(event) { event.preventDefault(); },
    onClick(event) {
      if (fired.current) { event.preventDefault(); fired.current = false; return true; }
      const now = Date.now(); taps.current = [...taps.current.filter(time => now-time<6000),now];
      if (taps.current.length >= 8) { taps.current = []; onUnlock(); return true; }
      return false;
    },
  };
}
