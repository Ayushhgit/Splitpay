'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PIN_LENGTH, lockNow, setPin, verifyPin } from '@/lib/auth';

const field =
  'min-h-[54px] rounded-lg border border-edge bg-recessed px-3 text-lg tracking-[0.4em] text-chrome placeholder:tracking-normal placeholder:text-chrome-faint';

/** Change the counter PIN, or lock the till right now. */
export function LockSettings() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [state, setState] = useState<'idle' | 'saved' | string>('idle');
  const [busy, setBusy] = useState(false);

  async function change() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await verifyPin(current))) {
        setState('That is not the current PIN.');
        return;
      }
      if (!/^\d{4,8}$/.test(next)) {
        setState('A new PIN is 4 to 8 digits.');
        return;
      }
      await setPin(next);
      setCurrent('');
      setNext('');
      setState('saved');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-9">
      <h2 className="text-sm font-bold text-cyan">The counter lock</h2>

      <div className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label text-chrome">Current PIN</span>
          <input
            value={current}
            onChange={(e) =>
              setCurrent(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder={'•'.repeat(PIN_LENGTH)}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label text-chrome">New PIN</span>
          <input
            value={next}
            onChange={(e) =>
              setNext(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder={'•'.repeat(PIN_LENGTH)}
            className={field}
          />
        </label>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={change}
            disabled={busy || !current || !next}
            className="key key-commit min-h-[54px] flex-1"
          >
            Change PIN
          </button>
          <button
            type="button"
            onClick={() => {
              lockNow();
              router.refresh();
              window.location.reload();
            }}
            className="key key-quiet min-h-[54px] flex-1"
          >
            Lock now
          </button>
        </div>

        {state === 'saved' ? (
          <p className="text-sm font-semibold text-cyan" role="status">
            PIN changed.
          </p>
        ) : state !== 'idle' ? (
          <p className="text-sm font-semibold text-magenta" role="alert">
            {state}
          </p>
        ) : null}

        <p className="text-sm leading-relaxed text-chrome-soft">
          <span className="font-bold text-chrome">What the lock does.</span> It
          keeps someone who picks up this phone out of the till and the ledger,
          and it closes itself after five minutes of no use.
        </p>
        <p className="text-sm leading-relaxed text-chrome-soft">
          <span className="font-bold text-chrome">What it does not do.</span>{' '}
          The whole app runs in the browser with nothing behind it, so the PIN
          is checked on the same device as the person entering it. Someone
          willing to open developer tools can step past it. It is a lock on a
          phone, not a lock on the address — if the address itself needs to
          refuse strangers, that has to be set on the deployment.
        </p>
      </div>
    </section>
  );
}
