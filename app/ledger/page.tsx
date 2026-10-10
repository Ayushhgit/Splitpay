'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppBar } from '@/components/app-bar';
import { ClearLedger } from '@/components/clear-ledger';
import { ExemptionMeter } from '@/components/exemption-meter';
import { formatInrTrim } from '@/lib/money';
import {
  type MonthTotals,
  type Sale,
  monthKey,
  paidPaise,
  repo,
} from '@/lib/store';

const day = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default function LedgerPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [totals, setTotals] = useState<MonthTotals | null>(null);
  // Read the clock after mount: the current month is not knowable at prerender.
  const [month, setMonth] = useState<string | null>(null);

  const load = useCallback(() => {
    const now = monthKey();
    setMonth(now);
    repo.listSales(60).then(setSales);
    repo.monthTotals(now).then(setTotals);
  }, []);

  useEffect(load, [load]);

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

  return (
    <main className="screen-in mx-auto w-full max-w-md px-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <AppBar heading="Ledger" back={{ href: '/', label: 'Counter' }} />

      {totals && month ? (
        <>
          <ExemptionMeter receivedPaise={totals.receivedPaise} month={month} />
          {totals.savedPaise > 0 ? (
            <p className="mt-3 text-sm text-chrome-soft">
              <span className="readout text-magenta">
                {formatInrTrim(totals.savedPaise)} kept
              </span>{' '}
              across {totals.saleCount}{' '}
              {totals.saleCount === 1 ? 'memo' : 'memos'} this month.
            </p>
          ) : null}
        </>
      ) : null}

      <h2 className="label mt-7 mb-1">Memos</h2>

      {sales && sales.length === 0 ? (
        <p className="leading-relaxed text-chrome-soft">
          No memos yet. Enter an amount on the counter screen and the first one
          lands here.
        </p>
      ) : null}

      <ul className="flex flex-col">
        {(sales ?? []).map((sale) => {
          const collected = paidPaise(sale);
          return (
            <li key={sale.id} className="border-b border-edge last:border-0">
              <Link
                href={
                  (sale.status === 'paid' ? '/receipt?id=' : '/sale?id=') +
                  sale.id
                }
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-bold">{sale.invoiceLabel}</span>
                  <span className="text-xs text-chrome-faint">
                    {day.format(sale.createdAt)}, {sale.legs.length}{' '}
                    {sale.legs.length === 1 ? 'stub' : 'stubs'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="readout text-base">
                    {formatInrTrim(sale.totalPaise)}
                  </span>
                  <span className="text-xs">
                    {sale.status === 'paid' ? (
                      <span className="text-cyan">settled</span>
                    ) : sale.status === 'void' ? (
                      <span className="text-chrome-faint">cancelled</span>
                    ) : (
                      <span className="text-magenta">
                        {formatInrTrim(sale.totalPaise - collected)} left
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {sales && sales.length > 0 ? (
        <button
          type="button"
          onClick={downloadCsv}
          className="key key-quiet mt-6 min-h-[56px] w-full text-base font-semibold"
        >
          Download ledger as CSV
        </button>
      ) : null}

      {sales ? <ClearLedger sales={sales} onCleared={load} /> : null}
    </main>
  );
}
