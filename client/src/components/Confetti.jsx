import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti() {
  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return null;
}
