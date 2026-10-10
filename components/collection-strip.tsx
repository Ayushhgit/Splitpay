import { formatInrTrim } from '@/lib/money';
import type { Leg } from '@/lib/store';

/**
 * Everything the merchant needs to know about the memo, in one panel: which
 * memo, what it is worth, how much is in, and which stubs are done. It is all
 * one block so the stub below it owns the screen.
 *
 * A paid stub is tappable to undo it — the customer sometimes scans out of
 * order, or a payment fails after the merchant has already ticked it off.
 */
export function CollectionStrip({
  invoiceLabel,
  totalPaise,
  paidPaise,
  legs,
  onUndo,
}: {
  invoiceLabel: string;
  totalPaise: number;
  paidPaise: number;
  legs: Leg[];
  onUndo: (leg: Leg) => void;
}) {
  const pct = totalPaise === 0 ? 0 : Math.round((paidPaise / totalPaise) * 100);
  const left = totalPaise - paidPaise;
  const paidLegs = legs.filter((l) => l.status === 'paid').length;

  return (
    <section className="display flex shrink-0 flex-col gap-3 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-cyan">Memo {invoiceLabel}</span>
        <span className="readout text-lg">{formatInrTrim(totalPaise)}</span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-edge"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatInrTrim(paidPaise)} of ${formatInrTrim(totalPaise)} collected`}
      >
        <div
          className={
            'relative h-full overflow-hidden rounded-full bg-cyan transition-[width] duration-500 ease-out' +
            (left > 0 ? ' rail-sweep' : '')
          }
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        <ul className="pip-row" aria-label="Stubs in this memo">
          {legs.map((leg) => (
            <li key={leg.id}>
              <button
                type="button"
                onClick={() => onUndo(leg)}
                disabled={leg.status !== 'paid'}
                aria-label={
                  leg.status === 'paid'
                    ? 'Stub ' + leg.seq + ' is paid. Undo it'
                    : 'Stub ' + leg.seq + ' is not paid yet'
                }
                className={
                  leg.status === 'paid'
                    ? 'pip bg-cyan font-bold text-machine'
                    : 'pip border border-edge font-semibold text-chrome-faint'
                }
              >
                {leg.seq}
              </button>
            </li>
          ))}
        </ul>
        <span className="ml-auto shrink-0 text-right text-sm font-semibold text-chrome-soft">
          {left > 0 ? (
            <>
              {formatInrTrim(left)} left
              <span className="block text-xs text-chrome-faint">
                {paidLegs} of {legs.length} in
              </span>
            </>
          ) : (
            <span className="text-cyan">Memo settled</span>
          )}
        </span>
      </div>
    </section>
  );
}
