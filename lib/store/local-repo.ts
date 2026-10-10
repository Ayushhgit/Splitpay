import { clear, createStore, del, entries, get, set } from 'idb-keyval';
import { splitSale } from '../split';
import { toDecimalRupees } from '../money';
import { legNote, legRef, newSaleShortId } from '../upi';
import {
  type ConfirmLegInput,
  type CreateSaleInput,
  type Repository,
  monthKey,
} from './repository';
import {
  type MonthTotals,
  type Sale,
  type Settings,
  defaultSettings,
  deriveStatus,
} from './types';

const SALES = createStore('splitqr-sales', 'sales');
const CONFIG = createStore('splitqr-config', 'config');
const SETTINGS_KEY = 'settings';

/**
 * On-device storage. The ledger lives in IndexedDB on this phone and nowhere
 * else: no sale data leaves the device, and equally, it is not on any other
 * device. Settings has the VPA, so it stays here too.
 */
export const localRepo: Repository = {
  async getSettings() {
    const stored = await get<Settings>(SETTINGS_KEY, CONFIG);
    return { ...defaultSettings, ...stored };
  },

  async saveSettings(patch) {
    const next = { ...(await this.getSettings()), ...patch };
    await set(SETTINGS_KEY, next, CONFIG);
    return next;
  },

  async createSale({ totalPaise, splitMode, note = '' }: CreateSaleInput) {
    const settings = await this.getSettings();
    const split = splitSale(totalPaise, splitMode);
    const shortId = newSaleShortId();
    const invoiceNo = settings.nextInvoiceNo;
    const invoiceLabel = `${settings.invoicePrefix}${invoiceNo}`;

    const sale: Sale = {
      id: `${Date.now().toString(36)}${shortId}`,
      shortId,
      invoiceNo,
      invoiceLabel,
      totalPaise,
      splitMode,
      status: 'open',
      note,
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

    // Write the sale before advancing the counter: a crash in between leaves a
    // reused number, which is recoverable, where the reverse leaves a gap.
    await set(sale.id, sale, SALES);
    await set(SETTINGS_KEY, { ...settings, nextInvoiceNo: invoiceNo + 1 }, CONFIG);
    return sale;
  },

  async getSale(id) {
    return (await get<Sale>(id, SALES)) ?? null;
  },

  async listSales(limit) {
    const all = (await entries<string, Sale>(SALES)).map(([, s]) => s);
    all.sort((a, b) => b.createdAt - a.createdAt);
    return limit ? all.slice(0, limit) : all;
  },

  async confirmLeg({ saleId, legId, status, confirmedBy, pspTxnId }: ConfirmLegInput) {
    const sale = await this.getSale(saleId);
    if (!sale) throw new Error(`no sale ${saleId}`);
    if (sale.status === 'void') throw new Error('cannot change a cancelled sale');

    const next: Sale = {
      ...sale,
      legs: sale.legs.map((l) =>
        l.id !== legId
          ? l
          : {
              ...l,
              status,
              paidAt: status === 'paid' ? Date.now() : undefined,
              confirmedBy: status === 'paid' ? confirmedBy : undefined,
              pspTxnId: status === 'paid' ? pspTxnId : undefined,
            }
      ),
    };
    next.status = deriveStatus(next);
    next.closedAt = next.status === 'paid' ? Date.now() : undefined;

    await set(next.id, next, SALES);
    return next;
  },

  async voidSale(id) {
    const sale = await this.getSale(id);
    if (!sale) throw new Error(`no sale ${id}`);
    // The sale is kept, not deleted: the invoice number stays spoken for, so
    // the sequence has no gap for an auditor to ask about.
    const next: Sale = { ...sale, status: 'void', closedAt: Date.now() };
    await set(next.id, next, SALES);
    return next;
  },

  async monthTotals(month) {
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

  async deleteSales(ids) {
    let removed = 0;
    for (const id of ids) {
      if (await get<Sale>(id, SALES)) {
        await del(id, SALES);
        removed += 1;
      }
    }
    return removed;
  },

  async clearSales() {
    const all = await this.listSales();
    await clear(SALES);
    return all.length;
  },

  async resetEverything() {
    await clear(SALES);
    await del(SETTINGS_KEY, CONFIG);
  },

  async exportCsv() {
    const sales = await this.listSales();
    // Amounts are plain rupee decimals with a currency column beside them, so
    // a spreadsheet reads them as numbers and the columns add up. "Rs 7,300.00"
    // would arrive as text and total to nothing.
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


