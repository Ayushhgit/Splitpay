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
}

export function monthKey(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
