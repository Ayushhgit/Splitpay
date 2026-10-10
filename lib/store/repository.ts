import type { SplitMode } from '../split';
import type { LegStatus, MonthTotals, Sale, Settings } from './types';

export interface CreateSaleInput {
  totalPaise: number;
  splitMode: SplitMode;
  note?: string;
}

export interface ConfirmLegInput {
  saleId: string;
  legId: string;
  status: LegStatus;
  confirmedBy: 'manual' | 'psp';
  pspTxnId?: string;
}

/**
 * Storage seam. The app ships against the on-device implementation in
 * local-repo.ts; swapping to a hosted database means writing one more of these
 * and changing the export in index.ts.
 */
export interface Repository {
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  /** Allocates the next invoice number and builds the legs. */
  createSale(input: CreateSaleInput): Promise<Sale>;
  getSale(id: string): Promise<Sale | null>;
  listSales(limit?: number): Promise<Sale[]>;
  confirmLeg(input: ConfirmLegInput): Promise<Sale>;
  voidSale(id: string): Promise<Sale>;
  /** `month` is "YYYY-MM" in local time. */
  monthTotals(month: string): Promise<MonthTotals>;
  exportCsv(): Promise<string>;

  /**
   * Remove specific memos. Returns how many were actually removed.
   *
   * The invoice counter is deliberately left where it is: numbers that have
   * been handed to a customer are never handed out again, whatever happens to
   * the records here.
   */
  deleteSales(ids: string[]): Promise<number>;
  /** Remove every memo, keeping settings and the invoice counter. */
  clearSales(): Promise<number>;
  /** Memos, settings, UPI ID, invoice counter — back to a blank device. */
  resetEverything(): Promise<void>;
}

export function monthKey(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
