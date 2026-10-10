'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppBar } from '@/components/app-bar';
import { MDR } from '@/lib/mdr';
import { formatInr, formatInrTrim } from '@/lib/money';
import { type Sale, paidPaise, repo } from '@/lib/store';

const when = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function Receipt() {
  const id = useSearchParams().get('id') ?? '';
  const [sale, setSale] = useState<Sale | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    repo.getSale(id).then(setSale);
  }, [id]);

  if (!sale) {
    return (
      <main className="mx-auto w-full max-w-md px-3">
        <AppBar heading="Memo" back={{ href: '/ledger', label: 'Ledger' }} />
      </main>
    );
  }

  const collected = paidPaise(sale);

  async function share() {
    if (!sale) return;
    const lines = [
      'Memo ' + sale.invoiceLabel,
      when.format(sale.createdAt),
      'Total ' + formatInr(sale.totalPaise),
      '',
      ...sale.legs.map(
        (l) =>
          'Stub ' +
          l.seq +
          '/' +
          sale.legs.length +
          '  ' +
          formatInr(l.amountPaise) +
          '  ' +
          l.ref +
          '  ' +
          l.status
      ),
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Memo ' + sale.invoiceLabel, text: lines });
        return;
      } catch {
        // The person dismissed the sheet. Fall through to the clipboard.
      }
    }
    await navigator.clipboard.writeText(lines);
    setShareNote('Memo copied.');
  }

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
    <main className="mx-auto w-full max-w-md px-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <AppBar heading="Memo" back={{ href: '/ledger', label: 'Ledger' }} />

      <article className="paper stub-feed mt-2 px-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="paper-figure text-xl text-cyan-deep">
            {sale.invoiceLabel}
          </span>
          <span className="text-xs text-ink-faint">
            {when.format(sale.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex items-start gap-1.5">
          <span className="mt-[0.5em] text-base font-semibold text-cyan-deep">
            &#8377;
          </span>
          <span className="paper-figure text-[3rem]">
            {formatInr(sale.totalPaise).slice(1)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          One sale, one memo number, collected as {sale.legs.length}{' '}
          {sale.legs.length === 1 ? 'payment' : 'payments'}. Each stub below
          carries this memo number, so a bank statement traces back to this one
          entry.
        </p>

        <div className="my-4 border-t border-dashed rule-ink" aria-hidden />

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint">
              <th scope="col" className="pb-2 font-medium">
                Stub
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Amount
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Reference
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.legs.map((leg) => (
              <tr key={leg.id} className="border-t rule-ink">
                <td className="py-2.5 align-top">
                  <span className="paper-figure">
                    {leg.seq}/{sale.legs.length}
                  </span>
                  <span
                    className={
                      leg.status === 'paid'
                        ? 'ml-2 font-semibold text-violet'
                        : 'ml-2 text-ink-faint'
                    }
                  >
                    {leg.status === 'paid' ? 'paid' : 'unpaid'}
                  </span>
                  {leg.paidAt ? (
                    <div className="text-xs text-ink-faint">
                      {when.format(leg.paidAt)}
                    </div>
                  ) : null}
                </td>
                <td className="paper-figure py-2.5 text-right align-top">
                  {formatInrTrim(leg.amountPaise)}
                </td>
                <td className="py-2.5 text-right align-top">
                  <span className="ref">{leg.ref}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink">
              <td className="pt-3 font-semibold">Collected</td>
              <td className="paper-figure pt-3 text-right text-lg">
                {formatInrTrim(collected)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>

        {sale.savingPaise > 0 ? (
          <p className="mt-5 border-l-4 border-magenta-ink pl-3 text-sm leading-relaxed">
            <span className="font-bold text-magenta-ink">
              {formatInrTrim(sale.savingPaise)} of MDR not charged
            </span>{' '}
            by keeping every stub at {formatInrTrim(MDR.exemptUpToPaise)} or
            below. The {Math.round(MDR.gstRateOnMdr * 100)}% GST on that fee,{' '}
            {formatInrTrim(Math.round(sale.savingPaise * MDR.gstRateOnMdr))},
            would have been reclaimable as input tax credit, so it is not a
            saving on its own.
          </p>
        ) : null}

        {sale.status === 'void' ? (
          <p className="mt-5 text-sm font-semibold text-magenta-ink">
            This memo was cancelled. The number stays used so the sequence has
            no gap.
          </p>
        ) : null}
      </article>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={share}
          className="key key-quiet min-h-[56px] flex-1 text-base font-semibold"
        >
          Share memo
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="key key-quiet min-h-[56px] flex-1 text-base font-semibold"
        >
          Download ledger
        </button>
      </div>
      {shareNote ? (
        <p className="mt-2 text-sm text-chrome-soft" role="status">
          {shareNote}
        </p>
      ) : null}
    </main>
  );
}
