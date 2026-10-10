import type { SplitMode } from '../split';

export type LegStatus = 'pending' | 'paid' | 'failed';
export type SaleStatus = 'open' | 'partial' | 'paid' | 'void';

/** One payment leg of a sale. Never its own invoice. */
export interface Leg {
  id: string;
  seq: number;
  amountPaise: number;
  /** UPI transaction reference. Reconciles this leg to a bank statement row. */
  ref: string;
  /** UPI note. Carries the shared invoice label and the leg's position. */
  note: string;
  status: LegStatus;
  paidAt?: number;
  confirmedBy?: 'manual' | 'psp';
  pspTxnId?: string;
}

/**
 * One sale, one invoice, many legs. The invoice number is allocated once and
 * never reused, so a gap in the sequence is a sign something was deleted.
 */
export interface Sale {
  id: string;
  /** Six characters, used to build each leg's UPI reference. */
  shortId: string;
  invoiceNo: number;
  /** What the customer sees on their statement, e.g. "INV1042". */
  invoiceLabel: string;
  totalPaise: number;
  splitMode: SplitMode;
  status: SaleStatus;
  note: string;
  /** MDR this split avoids, recorded at the time of the sale. */
  savingPaise: number;
  createdAt: number;
  closedAt?: number;
  legs: Leg[];
}

export interface Settings {
  vpa: string;
  payeeName: string;
  invoicePrefix: string;
  nextInvoiceNo: number;
  defaultSplitMode: SplitMode;
}

export const defaultSettings: Settings = {
  vpa: '',
  payeeName: '',
  invoicePrefix: 'INV',
  nextInvoiceNo: 1001,
  defaultSplitMode: 'maxfill',
};

export interface MonthTotals {
  /** Paid legs in the month. Only what this app recorded. */
  receivedPaise: number;
  savedPaise: number;
  saleCount: number;
  pendingPaise: number;
}

export function paidPaise(sale: Sale): number {
  return sale.legs
    .filter((l) => l.status === 'paid')
    .reduce((s, l) => s + l.amountPaise, 0);
}

export function outstandingPaise(sale: Sale): number {
  return sale.totalPaise - paidPaise(sale);
}

/** A sale's status is derived from its legs, never set by hand. */
export function deriveStatus(sale: Sale): SaleStatus {
  if (sale.status === 'void') return 'void';
  const paid = sale.legs.filter((l) => l.status === 'paid').length;
  if (paid === 0) return 'open';
  if (paid === sale.legs.length) return 'paid';
  return 'partial';
}
