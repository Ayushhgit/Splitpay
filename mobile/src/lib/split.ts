import { MDR, gstOnMdr, mdrFor, minLegsFor } from './mdr';

export type SplitMode = 'maxfill' | 'equal';

export interface SplitLeg {
  /** 1-based position in the sale. */
  seq: number;
  amountPaise: number;
}

export interface SplitResult {
  mode: SplitMode;
  totalPaise: number;
  legs: SplitLeg[];
  legCount: number;
  /** True when the sale was actually divided. */
  isSplit: boolean;
  /** MDR the merchant would pay taking the sale as one transaction. */
  unsplitMdrPaise: number;
  /** MDR across the legs. Zero whenever every leg sits in the exempt band. */
  splitMdrPaise: number;
  savingPaise: number;
  /** GST on the MDR avoided. Reclaimable as ITC, so shown apart. */
  gstOnSavedMdrPaise: number;
  /** What one extra scan is worth. Falls away once the Rs 300 cap engages. */
  savingPerLegPaise: number;
}

/**
 * Divide a sale into payment legs that each stay inside the zero-MDR band.
 *
 * This splits PAYMENTS, not invoices: every leg belongs to one sale and one
 * invoice number. See lib/upi.ts for the note that carries that link onto the
 * customer's bank statement.
 *
 * A total of zero is legal and yields one empty leg: the keypad calls this on
 * every keystroke, starting from nothing typed.
 */
export function splitSale(totalPaise: number, mode: SplitMode): SplitResult {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error(`splitSale needs non-negative integer paise, got ${totalPaise}`);
  }

  const unsplitMdrPaise = mdrFor(totalPaise);

  const amounts =
    totalPaise <= MDR.exemptUpToPaise
      ? [totalPaise]
      : mode === 'maxfill'
        ? maxFill(totalPaise)
        : equalLegs(totalPaise);

  const legs = amounts.map((amountPaise, i) => ({ seq: i + 1, amountPaise }));
  assertSound(legs, totalPaise);

  const splitMdrPaise = legs.reduce((sum, l) => sum + mdrFor(l.amountPaise), 0);
  const savingPaise = unsplitMdrPaise - splitMdrPaise;

  return {
    mode,
    totalPaise,
    legs,
    legCount: legs.length,
    isSplit: legs.length > 1,
    unsplitMdrPaise,
    splitMdrPaise,
    savingPaise,
    gstOnSavedMdrPaise: gstOnMdr(savingPaise),
    savingPerLegPaise: Math.floor(savingPaise / legs.length),
  };
}

/** As many full Rs 2,000 legs as fit, then the remainder. Fewest scans. */
function maxFill(totalPaise: number): number[] {
  const band = MDR.exemptUpToPaise;
  const full = Math.floor(totalPaise / band);
  const remainder = totalPaise - full * band;
  const amounts = new Array<number>(full).fill(band);
  if (remainder > 0) amounts.push(remainder);
  return amounts;
}

/**
 * Same leg count as maxFill, but evened out so no leg looks engineered to the
 * threshold. Leftover paise go to the earliest legs so the sum stays exact.
 */
function equalLegs(totalPaise: number): number[] {
  const n = minLegsFor(totalPaise);
  const base = Math.floor(totalPaise / n);
  const extra = totalPaise - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * The two invariants that make this app trustworthy: the legs add up to the
 * sale exactly, and a split sale has no leg that attracts MDR. A violation is
 * a bug that would cost the merchant money or short the customer, so it throws
 * rather than reaching the screen.
 */
function assertSound(legs: SplitLeg[], totalPaise: number): void {
  const sum = legs.reduce((s, l) => s + l.amountPaise, 0);
  if (sum !== totalPaise) {
    throw new Error(`split legs sum to ${sum}, expected ${totalPaise}`);
  }
  if (legs.length > 1) {
    const over = legs.find((l) => l.amountPaise > MDR.exemptUpToPaise);
    if (over) {
      throw new Error(
        `leg ${over.seq} of ${legs.length} is ${over.amountPaise} paise, above the exempt band`
      );
    }
  }
  if (legs.length > 1 && legs.some((l) => l.amountPaise <= 0)) {
    throw new Error('split produced a zero or negative leg');
  }
}
