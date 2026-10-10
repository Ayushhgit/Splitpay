'use client';

import { useEffect, useRef } from 'react';

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

/**
 * Calculator order, the way a card terminal is laid out, not phone-dialer
 * order. Rows are a fixed thumb height rather than stretching, so the pad reads
 * as a keypad on a tall screen instead of four bands of empty slab. A long
 * press on the back key clears the amount.
 */
export function AmountPad({
  onDigit,
  onDecimal,
  onBackspace,
  onClear,
  className = '',
}: {
  onDigit: (d: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onClear: () => void;
  className?: string;
}) {
  const holdTimer = useRef<number | null>(null);
  const didHold = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) onDigit(e.key);
      else if (e.key === '.') onDecimal();
      else if (e.key === 'Backspace') onBackspace();
      else if (e.key === 'Escape') onClear();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDigit, onDecimal, onBackspace, onClear]);

  function startHold() {
    didHold.current = false;
    holdTimer.current = window.setTimeout(() => {
      didHold.current = true;
      onClear();
    }, 550);
  }

  function cancelHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  return (
    <div
      className={
        'grid shrink-0 auto-rows-[clamp(52px,8.4dvh,74px)] grid-cols-3 gap-2 ' +
        className
      }
    >
      {DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          className="key"
          onClick={() => onDigit(d)}
          aria-label={d}
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        className="key text-chrome-soft"
        onClick={onDecimal}
        aria-label="Decimal point"
      >
        .
      </button>
      <button
        type="button"
        className="key"
        onClick={() => onDigit('0')}
        aria-label="0"
      >
        0
      </button>
      <button
        type="button"
        className="key text-chrome-soft"
        onPointerDown={startHold}
        onPointerUp={() => {
          cancelHold();
          if (!didHold.current) onBackspace();
        }}
        onPointerLeave={cancelHold}
        aria-label="Delete last digit, hold to clear"
      >
        <svg
          width="30"
          height="23"
          viewBox="0 0 26 20"
          fill="none"
          aria-hidden
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M8.4 1.6h15a1.6 1.6 0 0 1 1.6 1.6v13.6a1.6 1.6 0 0 1-1.6 1.6h-15L1 10z" />
          <path d="M12.6 7.2l6 5.6M18.6 7.2l-6 5.6" />
        </svg>
      </button>
    </div>
  );
}
