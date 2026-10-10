'use client';

import { formatInrTrim } from '@/lib/money';
import type { Leg } from '@/lib/store';
import { QrCode } from './qr-code';

/**
 * One stub, torn from one memo: its position in the memo, its amount, the code
 * to scan, and the reference that will show up on the bank statement.
 *
 * Bright paper on the dark machine. It fills the space it is given and the code
 * grows with it, because this is held up across a counter and the only thing
 * the customer is asked to look at.
 */
export function Stub({
  leg,
  count,
  upiUri,
  invoiceLabel,
  stamped = false,
  tearing = false,
  feeding = false,
}: {
  leg: Leg;
  count: number;
  upiUri: string;
  invoiceLabel: string;
  stamped?: boolean;
  tearing?: boolean;
  /** The stub that just advanced into place feeds up out of the book. */
  feeding?: boolean;
}) {
  return (
    <div
      className={[
        'paper flex h-full flex-col px-5',
        feeding ? 'stub-feed' : '',
        stamped ? 'is-stamping' : '',
        tearing ? 'is-tearing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-cyan-deep">
          Stub {leg.seq} of {count}
        </span>
        <span className="paper-figure text-[1.9rem]">
          {formatInrTrim(leg.amountPaise)}
        </span>
      </div>

      <div className="my-3 shrink-0 border-t border-dashed rule-ink" aria-hidden />

      <QrCode
        value={upiUri}
        ring={!stamped && !tearing}
        label={`Scan to pay ${formatInrTrim(leg.amountPaise)}, stub ${leg.seq} of ${count} of memo ${invoiceLabel}`}
      />

      <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
        <span className="ref">{leg.ref}</span>
        <span className="ref">{leg.note}</span>
      </div>

      {stamped && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="stamp stamp-mark text-3xl opacity-0">PAID</span>
        </div>
      )}
    </div>
  );
}
