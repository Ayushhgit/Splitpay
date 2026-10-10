/**
 * The MDR rules, in one place.
 *
 * Source: NPCI circular effective 15 Oct 2026 — 0.4% MDR on person-to-merchant
 * UPI transactions ABOVE Rs 2,000, capped at Rs 300 (cap engages at Rs 75,000).
 * Transactions of Rs 2,000 and below carry zero MDR, so Rs 2,000 exactly is the
 * largest exempt leg. 18% GST applies to the MDR fee only, never to the sale,
 * and a GST-registered merchant reclaims it as input tax credit.
 *
 * Small merchants receiving up to Rs 1 lakh a month via UPI QR into their own
 * account are exempt outright.
 *
 * When these numbers move, they move here and nowhere else.
 */
export const MDR = {
  /** Largest leg that attracts no MDR. Rs 2,000 inclusive. */
  exemptUpToPaise: 200_000,
  /** 0.4%. */
  rate: 0.004,
  /** Rs 300 ceiling on a single transaction's MDR. */
  capPaise: 30_000,
  /** GST charged on the MDR fee. Reclaimable as ITC. */
  gstRateOnMdr: 0.18,
  /** Monthly UPI receipts below which a merchant pays no MDR at all. */
  monthlyExemptPaise: 10_000_000,
  effectiveFrom: '2026-10-15',
} as const;

/** MDR payable on a single transaction of `amountPaise`. */
export function mdrFor(amountPaise: number): number {
  if (amountPaise <= MDR.exemptUpToPaise) return 0;
  return Math.min(Math.round(amountPaise * MDR.rate), MDR.capPaise);
}

/** GST charged on an MDR fee. Shown separately because it comes back as ITC. */
export function gstOnMdr(mdrPaise: number): number {
  return Math.round(mdrPaise * MDR.gstRateOnMdr);
}

/** Smallest number of legs that keeps every leg inside the exempt band. */
export function minLegsFor(amountPaise: number): number {
  if (amountPaise <= MDR.exemptUpToPaise) return 1;
  return Math.ceil(amountPaise / MDR.exemptUpToPaise);
}
