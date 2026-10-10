import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';

/**
 * Where the month stands against the Rs 1 lakh small-merchant exemption.
 *
 * Says the unwelcome thing plainly: below the line, no MDR applies at all and
 * splitting saves nothing. It also admits what it cannot see — only payments
 * recorded in this app, not every UPI receipt the shop takes.
 */
export function ExemptionMeter({
  receivedPaise,
  month,
}: {
  receivedPaise: number;
  month: string;
}) {
  const limit = MDR.monthlyExemptPaise;
  const pct = Math.min(100, Math.round((receivedPaise / limit) * 100));
  const under = receivedPaise < limit;

  return (
    <section className="display screen-in px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-cyan">{monthName(month)}</h2>
        <span className="readout text-sm text-chrome-soft">
          {formatInrTrim(receivedPaise)} of {formatInrTrim(limit)}
        </span>
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-machine"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Share of the monthly exemption used"
      >
        <div
          className={
            under
              ? 'h-full rounded-full bg-cyan'
              : 'h-full rounded-full bg-magenta'
          }
          style={{ width: pct + '%' }}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-chrome-soft">
        {under ? (
          <>
            Under {formatInrTrim(limit)} a month, UPI QR receipts into your own
            account carry no MDR. Splitting is not saving you anything yet.
          </>
        ) : (
          <>
            Past {formatInrTrim(limit)} this month, so MDR applies to merchant
            payments above {formatInrTrim(MDR.exemptUpToPaise)}.
          </>
        )}{' '}
        This counts only what was recorded here, not every payment the shop
        takes.
      </p>
    </section>
  );
}

function monthName(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, m - 1, 1));
}
