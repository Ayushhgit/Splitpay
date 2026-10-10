'use client';

import { MDR } from '@/lib/mdr';
import { formatInrTrim } from '@/lib/money';
import type { SplitResult } from '@/lib/split';
import { useTweenedPaise } from './readout';

/**
 * What the split is worth, recomputed on every keystroke.
 *
 * The figure travels to its new value rather than snapping, so a keypress reads
 * as moving the number rather than replacing it. The per-scan figure sits
 * beside the total because past the Rs 300 cap each extra scan is worth less,
 * and the merchant should see that before committing.
 */
export function SavingsStrip({ split }: { split: SplitResult }) {
  const kept = useTweenedPaise(split.isSplit ? split.savingPaise : 0);

  if (split.totalPaise === 0) {
    return (
      <p className="text-sm text-chrome-soft">
        Stubs of {formatInrTrim(MDR.exemptUpToPaise)} or less carry no MDR.
      </p>
    );
  }

  if (!split.isSplit) {
    return (
      <p className="text-sm text-chrome-soft">
        No MDR applies at {formatInrTrim(split.totalPaise)}. One code is enough.
      </p>
    );
  }

  /*
    A stub tops out at Rs 2,000, so a scan is worth at most 0.4% of that — about
    Rs 8 — however large the sale. That only gets worse once the Rs 300 cap
    binds, because the saving stops growing while the scans keep coming. Both
    conditions are needed: a small sale with an awkward remainder also has a low
    per-scan figure, and there is nothing wrong with it.
  */
  const capped = split.unsplitMdrPaise >= MDR.capPaise;
  const thin = capped && split.savingPerLegPaise < 500;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="readout text-xl text-magenta">
          {formatInrTrim(kept)}{' '}
          <span className="text-sm font-semibold tracking-normal">kept</span>
        </span>
        <span className="text-sm text-chrome-soft">
          {formatInrTrim(split.savingPerLegPaise)} a scan
        </span>
      </div>
      {thin && (
        <p className="text-sm leading-snug text-chrome-faint">
          MDR stops at {formatInrTrim(MDR.capPaise)} however large the sale, so
          these {split.legCount} scans are worth only{' '}
          {formatInrTrim(split.savingPerLegPaise)} each. Taking this as one
          payment may be worth the fee.
        </p>
      )}
    </div>
  );
}
