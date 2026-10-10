'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The amount, rendered one character at a time.
 *
 * Each character is keyed on its position and its own value, so React remounts
 * only the characters that actually changed and the drop-in animation plays on
 * those alone. Typing 7 into 1,234 animates the digits that moved, not the
 * whole number — which is what a mechanical readout does.
 */
export function Readout({
  whole,
  paise,
}: {
  whole: string;
  paise?: string;
}) {
  return (
    <span className="readout lit" style={{ fontSize: 'clamp(2.5rem, 13.5vw, 4.2rem)' }}>
      {[...whole].map((char, i) => (
        <span key={`${i}-${char}`} className="digit">
          {char}
        </span>
      ))}
      {paise !== undefined && (
        <span className="text-[0.46em] text-chrome-soft">
          {['.', ...paise].map((char, i) => (
            <span key={`p${i}-${char}`} className="digit">
              {char}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * A number that travels to its new value instead of jumping.
 *
 * Returns paise, so the caller still formats it. Short enough to feel like a
 * response to the keypress rather than an animation being watched.
 */
export function useTweenedPaise(target: number, ms = 280): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(target);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const travel = target - origin;
    if (travel === 0) return;

    function step(now: number) {
      const t = Math.min(1, (now - start) / ms);
      // Ease out: fast off the mark, settling onto the figure.
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(origin + travel * eased);
      setShown(value);
      from.current = value;
      if (t < 1) frame.current = requestAnimationFrame(step);
    }

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, ms]);

  return shown;
}
