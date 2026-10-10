'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IDLE_LOCK_MS,
  PIN_LENGTH,
  hasPin,
  howLongBlocked,
  isUnlocked,
  lockNow,
  setPin,
  touchActivity,
  unlockForNow,
  verifyPin,
} from '@/lib/auth';

type Phase = 'checking' | 'locked' | 'set' | 'confirm' | 'open';

/**
 * Nothing in the app renders until the counter is unlocked.
 *
 * On a phone with no PIN yet, the first thing it asks for is one — there is no
 * default to leave in place by accident.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [blockedFor, setBlockedFor] = useState(0);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!(await hasPin())) return setPhase('set');
      setPhase(isUnlocked() ? 'open' : 'locked');
      setBlockedFor(await howLongBlocked());
    })();
  }, []);

  // Relock after a spell of no use: a counter phone is put down mid-sale.
  const resetIdle = useCallback(() => {
    if (phase !== 'open') return;
    touchActivity();
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      lockNow();
      setPhase('locked');
      setEntry('');
    }, IDLE_LOCK_MS);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;
    resetIdle();
    const events = ['pointerdown', 'keydown', 'visibilitychange'] as const;
    for (const e of events) window.addEventListener(e, resetIdle);
    return () => {
      for (const e of events) window.removeEventListener(e, resetIdle);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [phase, resetIdle]);

  // Count the lockout down so the wait is visible rather than mysterious.
  useEffect(() => {
    if (blockedFor <= 0) return;
    const tick = window.setInterval(async () => {
      const left = await howLongBlocked();
      setBlockedFor(left);
      if (left <= 0) window.clearInterval(tick);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [blockedFor]);

  const reject = (message: string) => {
    setError(message);
    setShake((n) => n + 1);
    setEntry('');
    if ('vibrate' in navigator) navigator.vibrate([12, 60, 12]);
  };

  const submit = useCallback(
    async (pin: string) => {
      if (phase === 'set') {
        setFirstPin(pin);
        setEntry('');
        setError(null);
        setPhase('confirm');
        return;
      }
      if (phase === 'confirm') {
        if (pin !== firstPin) {
          setPhase('set');
          setFirstPin('');
          reject('Those did not match. Pick a PIN again.');
          return;
        }
        await setPin(pin);
        unlockForNow();
        setError(null);
        setPhase('open');
        return;
      }
      if (await verifyPin(pin)) {
        setError(null);
        setPhase('open');
      } else {
        const left = await howLongBlocked();
        setBlockedFor(left);
        reject(left > 0 ? 'Too many tries.' : 'Wrong PIN.');
      }
    },
    [phase, firstPin]
  );

  const press = useCallback(
    (digit: string) => {
      if (blockedFor > 0) return;
      setError(null);
      setEntry((prev) => {
        const next = prev + digit;
        if (next.length === PIN_LENGTH) void submit(next);
        return next.length >= PIN_LENGTH ? '' : next;
      });
    },
    [blockedFor, submit]
  );

  const back = useCallback(() => setEntry((p) => p.slice(0, -1)), []);

  useEffect(() => {
    if (phase === 'open' || phase === 'checking') return;
    function onKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, press, back]);

  if (phase === 'checking') {
    return <div className="min-h-dvh" aria-hidden />;
  }

  if (phase === 'open') return <>{children}</>;

  const heading =
    phase === 'set'
      ? 'Pick a PIN for this counter'
      : phase === 'confirm'
        ? 'Enter it once more'
        : 'Counter locked';

  const note =
    phase === 'set'
      ? `${PIN_LENGTH} digits. It keeps the till and the ledger closed when the phone is put down.`
      : phase === 'confirm'
        ? 'So a slip of the thumb does not lock you out of your own till.'
        : blockedFor > 0
          ? `Too many wrong tries. Try again in ${Math.ceil(blockedFor / 1000)}s.`
          : 'Enter the PIN to open the till.';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-2.5 py-1.5">
        <section className="display screen-in flex flex-col gap-4 px-4 py-5">
          <h1 className="text-base font-bold text-cyan">{heading}</h1>

          <div
            key={shake}
            className={shake ? 'shake flex justify-center gap-4' : 'flex justify-center gap-4'}
          >
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <span
                key={i}
                className={
                  i < entry.length
                    ? 'h-4 w-4 rounded-full bg-cyan'
                    : 'h-4 w-4 rounded-full border-2 border-edge'
                }
              />
            ))}
          </div>

          <p
            className={
              error
                ? 'min-h-[2.5rem] text-sm leading-snug text-magenta'
                : 'min-h-[2.5rem] text-sm leading-snug text-chrome-soft'
            }
            role={error ? 'alert' : undefined}
          >
            {error ? `${error} ${note}` : note}
          </p>
        </section>

        <div className="grid shrink-0 auto-rows-[clamp(52px,8.4dvh,74px)] grid-cols-3 gap-2 screen-in stagger-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              className="key"
              onClick={() => press(d)}
              disabled={blockedFor > 0}
              aria-label={d}
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            className="key"
            onClick={() => press('0')}
            disabled={blockedFor > 0}
            aria-label="0"
          >
            0
          </button>
          <button
            type="button"
            className="key text-chrome-soft"
            onClick={back}
            aria-label="Delete last digit"
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
      </div>
    </main>
  );
}
