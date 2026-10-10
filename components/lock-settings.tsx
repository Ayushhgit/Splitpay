'use client';

import { lockNow } from '@/lib/auth';

/** Lock the till right now, and say plainly what the lock is worth. */
export function LockSettings() {
  return (
    <section className="mt-9">
      <h2 className="text-sm font-bold text-cyan">The counter lock</h2>

      <div className="mt-3 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            lockNow();
            window.location.reload();
          }}
          className="key key-quiet min-h-[54px] w-full"
        >
          Lock now
        </button>

        <p className="text-sm leading-relaxed text-chrome-soft">
          <span className="font-bold text-chrome">What the lock does.</span> It
          keeps someone who picks up this phone out of the till and the ledger.
          It closes itself after five minutes of no use and on every new browser
          session, and it slows down after a run of wrong guesses.
        </p>
        <p className="text-sm leading-relaxed text-chrome-soft">
          <span className="font-bold text-chrome">What it does not do.</span>{' '}
          The PIN is fixed in the build, which means it is compiled into the
          JavaScript this phone downloaded and is readable by anyone who looks.
          The app has no server, so the check also runs on the same device as
          the person entering it. This is a lock on a phone, not a lock on the
          address.
        </p>
        <p className="text-sm leading-relaxed text-chrome-soft">
          To change the PIN, set <code className="text-chrome">
            NEXT_PUBLIC_ADMIN_PIN
          </code>{' '}
          and deploy again.
        </p>
      </div>
    </section>
  );
}
