'use client';

import { useState } from 'react';
import { formatInrTrim } from '@/lib/money';
import { type Sale, monthKey, paidPaise, repo } from '@/lib/store';

type Choice = {
  id: string;
  label: string;
  detail: string;
  pick: (sales: Sale[]) => Sale[];
  /** Also wipes settings and the UPI ID. */
  full?: boolean;
};

/*
  Four choices rather than one button, because "clear the ledger" is usually
  one of these three tidier things and only sometimes the whole lot.
*/
const CHOICES: Choice[] = [
  {
    id: 'cancelled',
    label: 'Cancelled memos',
    detail: 'Memos that were called off. No money ever moved against them.',
    pick: (sales) => sales.filter((s) => s.status === 'void'),
  },
  {
    id: 'older',
    label: 'Settled memos before this month',
    detail:
      'Everything already collected and closed in an earlier month. Export first if your accountant has not seen it.',
    pick: (sales) =>
      sales.filter(
        (s) => s.status === 'paid' && monthKey(s.createdAt) !== monthKey()
      ),
  },
  {
    id: 'all',
    label: 'Every memo',
    detail:
      'The whole ledger. Your UPI ID, settings and the next memo number stay as they are.',
    pick: (sales) => sales,
  },
  {
    id: 'reset',
    label: 'Everything, including settings',
    detail:
      'Memos, UPI ID, payee name and the memo numbering, all back to a blank device. For handing this phone on.',
    pick: (sales) => sales,
    full: true,
  },
];

/**
 * Clearing is irreversible and the data is only on this device, so each choice
 * states exactly what it will remove and has to be confirmed a second time.
 */
export function ClearLedger({
  sales,
  onCleared,
}: {
  sales: Sale[];
  onCleared: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function downloadCsv() {
    const csv = await repo.exportCsv();
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'counter-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function run(choice: Choice) {
    if (busy) return;
    setBusy(true);
    try {
      const picked = choice.pick(sales);
      if (choice.full) {
        await repo.resetEverything();
      } else if (choice.id === 'all') {
        await repo.clearSales();
      } else {
        await repo.deleteSales(picked.map((s) => s.id));
      }
      setConfirming(null);
      setDone(
        choice.full
          ? 'Device cleared. Add your UPI ID again in settings to take a payment.'
          : `${picked.length} ${picked.length === 1 ? 'memo' : 'memos'} removed.`
      );
      onCleared();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-bold text-magenta">Clearing the ledger</h2>
      <p className="mt-2 text-sm leading-relaxed text-chrome-soft">
        Memos live on this phone and nowhere else, so anything removed here is
        gone for good. Take the CSV first if these records still have to answer
        to anyone.
      </p>

      <button
        type="button"
        onClick={downloadCsv}
        disabled={sales.length === 0}
        className="key key-quiet mt-3 min-h-[54px] w-full"
      >
        Download the ledger first
      </button>

      <ul className="mt-4 flex flex-col gap-2.5">
        {CHOICES.map((choice) => {
          const picked = choice.pick(sales);
          const money = picked.reduce((sum, s) => sum + paidPaise(s), 0);
          const empty = picked.length === 0;
          const isConfirming = confirming === choice.id;

          return (
            <li
              key={choice.id}
              className={
                isConfirming
                  ? 'rounded-xl border border-magenta bg-recessed p-3.5'
                  : 'rounded-xl border border-edge p-3.5'
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{choice.label}</span>
                <span className="shrink-0 text-sm text-chrome-soft">
                  {empty ? 'nothing to remove' : `${picked.length} memo${picked.length === 1 ? '' : 's'}`}
                </span>
              </div>
              <p className="mt-1 text-sm leading-snug text-chrome-faint">
                {choice.detail}
              </p>

              {isConfirming ? (
                <>
                  <p className="mt-3 text-sm leading-snug text-magenta">
                    Removing {picked.length}{' '}
                    {picked.length === 1 ? 'memo' : 'memos'}
                    {money > 0 ? ` covering ${formatInrTrim(money)} collected` : ''}
                    {choice.full
                      ? ', along with your UPI ID and memo numbering'
                      : ''}
                    . This cannot be undone.
                  </p>
                  <div className="mt-3 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => run(choice)}
                      disabled={busy}
                      className="key min-h-[48px] flex-1 border-magenta text-base font-bold text-magenta"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="key key-quiet min-h-[48px] flex-1 text-base"
                    >
                      Keep them
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDone(null);
                    setConfirming(choice.id);
                  }}
                  disabled={empty && !choice.full}
                  className="key key-quiet mt-3 min-h-[48px] w-full text-base disabled:text-chrome-faint"
                >
                  {empty && !choice.full ? 'Nothing to remove' : 'Remove these'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {done ? (
        <p className="mt-4 text-sm font-semibold text-cyan" role="status">
          {done}
        </p>
      ) : null}
    </section>
  );
}
