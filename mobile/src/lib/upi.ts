import { toUpiAmount } from './money';
import { randomBytes } from './random';

export interface UpiPayee {
  vpa: string;
  payeeName: string;
}

/**
 * A virtual payment address. Deliberately permissive on the handle, which
 * varies widely across PSPs, and strict on shape.
 */
const VPA_RE = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

/** Some PSPs reject notes with punctuation, so keep to what every app accepts. */
export function sanitiseNote(note: string): string {
  return note
    .replace(/[^A-Za-z0-9 \-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

/**
 * The note every leg of a sale carries. It names one invoice and the leg's
 * position in it, so a bank statement reconciles N rows back to one taxable
 * supply. This is the audit trail; do not shorten it away.
 */
export function legNote(
  invoiceLabel: string,
  seq: number,
  count: number
): string {
  return sanitiseNote(`${invoiceLabel} ${seq}/${count}`);
}

/** Transaction reference. Alphanumeric, <=35 chars, unique per leg. */
export function legRef(saleShortId: string, seq: number): string {
  const ref = `${saleShortId}${String(seq).padStart(2, '0')}`.toUpperCase();
  if (!/^[A-Z0-9]{1,35}$/.test(ref)) {
    throw new Error(`legRef produced an invalid reference: ${ref}`);
  }
  return ref;
}

/** Six crockford-ish base32 characters. No vowels, so no accidental words. */
export function newSaleShortId(): string {
  const alphabet = '0123456789BCDFGHJKLMNPQRSTVWXYZ';
  return Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join(
    ''
  );
}

export interface LegUriInput {
  payee: UpiPayee;
  amountPaise: number;
  note: string;
  ref: string;
}

/**
 * A UPI intent URI.
 *
 * Built with encodeURIComponent rather than URLSearchParams on purpose:
 * URLSearchParams encodes a space as "+", and several UPI apps show that plus
 * sign literally in the payee name and note instead of a space.
 */
export function buildUpiUri({
  payee,
  amountPaise,
  note,
  ref,
}: LegUriInput): string {
  if (!isValidVpa(payee.vpa)) {
    throw new Error(`buildUpiUri got an invalid VPA: ${payee.vpa}`);
  }
  const params: Array<[string, string]> = [
    ['pa', payee.vpa.trim()],
    ['pn', payee.payeeName.trim() || 'Merchant'],
    ['am', toUpiAmount(amountPaise)],
    ['cu', 'INR'],
    ['tn', sanitiseNote(note)],
    ['tr', ref],
  ];
  const query = params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `upi://pay?${query}`;
}
