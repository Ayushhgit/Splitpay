import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDecimalRupees } from './money';
import { type SplitMode, splitSale } from './split';
import { legNote, legRef, newSaleShortId } from './upi';

/*
  The ledger, on this device.

  Same shape as the web app's repository, backed by AsyncStorage instead of
  IndexedDB: one key per memo under a prefix, and one key for settings. Memos
  are small and a shop makes tens a day, so reading the set and sorting in
  memory is cheaper than carrying a database.
*/

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
}

/**
 * One sale, one memo, many legs. The invoice number is allocated once and never
 * reused, so a gap in the sequence is a sign something was deleted.
 */
export interface Sale {
  id: string;
  shortId: string;
  invoiceNo: number;
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

/** A sale's status is derived from its legs, never set by hand. */
export function deriveStatus(sale: Sale): SaleStatus {
  if (sale.status === 'void') return 'void';
  const paid = sale.legs.filter((l) => l.status === 'paid').length;
  if (paid === 0) return 'open';
  if (paid === sale.legs.length) return 'paid';
  return 'partial';
}

/** `month` is "YYYY-MM" in local time. */
export function monthKey(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SALE_PREFIX = 'sale:';
const SETTINGS_KEY = 'settings';

async function allSaleKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(SALE_PREFIX));
}

export const repo = {
  async getSettings(): Promise<Settings> {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return { ...defaultSettings, ...(raw ? JSON.parse(raw) : {}) };
  },

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  },

  async createSale(input: {
    totalPaise: number;
    splitMode: SplitMode;
    note?: string;
  }): Promise<Sale> {
    const settings = await this.getSettings();
    const split = splitSale(input.totalPaise, input.splitMode);
    const shortId = newSaleShortId();
    const invoiceNo = settings.nextInvoiceNo;
    const invoiceLabel = `${settings.invoicePrefix}${invoiceNo}`;

    const sale: Sale = {
      id: `${Date.now().toString(36)}${shortId}`,
      shortId,
      invoiceNo,
      invoiceLabel,
      totalPaise: input.totalPaise,
      splitMode: input.splitMode,
      status: 'open',
      note: input.note ?? '',
      savingPaise: split.savingPaise,
      createdAt: Date.now(),
      legs: split.legs.map((leg) => ({
        id: `${shortId}-${leg.seq}`,
        seq: leg.seq,
        amountPaise: leg.amountPaise,
        ref: legRef(shortId, leg.seq),
        note: legNote(invoiceLabel, leg.seq, split.legCount),
        status: 'pending' as const,
      })),
    };

    // Write the memo before advancing the counter: a crash in between leaves a
    // reused number, which is recoverable, where the reverse leaves a gap.
    await AsyncStorage.setItem(SALE_PREFIX + sale.id, JSON.stringify(sale));
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...settings, nextInvoiceNo: invoiceNo + 1 })
    );
    return sale;
  },

  async getSale(id: string): Promise<Sale | null> {
    const raw = await AsyncStorage.getItem(SALE_PREFIX + id);
    return raw ? (JSON.parse(raw) as Sale) : null;
  },

  async listSales(limit?: number): Promise<Sale[]> {
    const keys = await allSaleKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    const all = pairs
      .map(([, v]) => (v ? (JSON.parse(v) as Sale) : null))
      .filter((s): s is Sale => s !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
    return limit ? all.slice(0, limit) : all;
  },

  async confirmLeg(input: {
    saleId: string;
    legId: string;
    status: LegStatus;
    confirmedBy: 'manual' | 'psp';
  }): Promise<Sale> {
    const sale = await this.getSale(input.saleId);
    if (!sale) throw new Error(`no sale ${input.saleId}`);
    if (sale.status === 'void') throw new Error('cannot change a cancelled memo');

    const next: Sale = {
      ...sale,
      legs: sale.legs.map((l) =>
        l.id !== input.legId
          ? l
          : {
              ...l,
              status: input.status,
              paidAt: input.status === 'paid' ? Date.now() : undefined,
              confirmedBy: input.status === 'paid' ? input.confirmedBy : undefined,
            }
      ),
    };
    next.status = deriveStatus(next);
    next.closedAt = next.status === 'paid' ? Date.now() : undefined;

    await AsyncStorage.setItem(SALE_PREFIX + next.id, JSON.stringify(next));
    return next;
  },

  async voidSale(id: string): Promise<Sale> {
    const sale = await this.getSale(id);
    if (!sale) throw new Error(`no sale ${id}`);
    // The memo is kept, not deleted: the number stays spoken for, so the
    // sequence has no gap for an auditor to ask about.
    const next: Sale = { ...sale, status: 'void', closedAt: Date.now() };
    await AsyncStorage.setItem(SALE_PREFIX + next.id, JSON.stringify(next));
    return next;
  },

  async monthTotals(month: string): Promise<MonthTotals> {
    const sales = (await this.listSales()).filter(
      (s) => s.status !== 'void' && monthKey(s.createdAt) === month
    );
    return sales.reduce<MonthTotals>(
      (t, s) => {
        for (const leg of s.legs) {
          if (leg.status === 'paid') t.receivedPaise += leg.amountPaise;
          else if (leg.status === 'pending') t.pendingPaise += leg.amountPaise;
        }
        if (s.status === 'paid') t.savedPaise += s.savingPaise;
        t.saleCount += 1;
        return t;
      },
      { receivedPaise: 0, savedPaise: 0, saleCount: 0, pendingPaise: 0 }
    );
  },

  /**
   * Remove specific memos. The invoice counter is deliberately left where it
   * is: a number handed to a customer is never handed out again.
   */
  async deleteSales(ids: string[]): Promise<number> {
    const keys = ids.map((id) => SALE_PREFIX + id);
    await AsyncStorage.multiRemove(keys);
    return ids.length;
  },

  async clearSales(): Promise<number> {
    const keys = await allSaleKeys();
    await AsyncStorage.multiRemove(keys);
    return keys.length;
  },

  async resetEverything(): Promise<void> {
    const keys = await allSaleKeys();
    await AsyncStorage.multiRemove([...keys, SETTINGS_KEY]);
  },

  async exportCsv(): Promise<string> {
    const sales = await this.listSales();
    // Amounts are plain rupee decimals with a currency column beside them, so
    // a spreadsheet reads them as numbers and the columns add up.
    const rows: string[][] = [
      [
        'invoice',
        'sale_date',
        'currency',
        'sale_total_inr',
        'sale_status',
        'leg',
        'of',
        'leg_amount_inr',
        'upi_ref',
        'upi_note',
        'leg_status',
        'leg_paid_at',
        'confirmed_by',
        'mdr_avoided_inr',
      ],
    ];
    for (const s of sales) {
      for (const l of s.legs) {
        rows.push([
          s.invoiceLabel,
          new Date(s.createdAt).toISOString(),
          'INR',
          toDecimalRupees(s.totalPaise),
          s.status,
          String(l.seq),
          String(s.legs.length),
          toDecimalRupees(l.amountPaise),
          l.ref,
          l.note,
          l.status,
          l.paidAt ? new Date(l.paidAt).toISOString() : '',
          l.confirmedBy ?? '',
          // Printed once per sale, on its first leg, so the column sums.
          l.seq === 1 ? toDecimalRupees(s.savingPaise) : '',
        ]);
      }
    }
    // Quote only what needs it: a quoted number is text to some spreadsheets.
    const cell = (value: string) =>
      /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    return rows.map((r) => r.map(cell).join(',')).join('\r\n');
  },
};
