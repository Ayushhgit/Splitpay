/**
 * Money is integer paise everywhere in this app. Never a float, never a string
 * that has been through parseFloat. The only places a decimal appears are the
 * display formatters and the UPI `am` parameter.
 */

/** A part-built amount from the keypad: rupees typed, then optionally paise. */
export interface AmountDraft {
  rupees: string;
  /** null until the decimal key is pressed, then 0-2 digits. */
  paise: string | null;
}

export const emptyDraft: AmountDraft = { rupees: '', paise: null };

export function draftToPaise(d: AmountDraft): number {
  const rupees = d.rupees === '' ? 0 : Number.parseInt(d.rupees, 10);
  const paise = d.paise ? Number.parseInt(d.paise.padEnd(2, '0'), 10) : 0;
  return rupees * 100 + paise;
}

/** Append a digit, refusing input that would overflow a sane sale. */
export function pushDigit(d: AmountDraft, digit: string): AmountDraft {
  if (d.paise !== null) {
    if (d.paise.length >= 2) return d;
    return { ...d, paise: d.paise + digit };
  }
  if (d.rupees.length >= 9) return d;
  if (d.rupees === '' && digit === '0') return d;
  return { ...d, rupees: d.rupees + digit };
}

export function pushDecimal(d: AmountDraft): AmountDraft {
  if (d.paise !== null) return d;
  return { rupees: d.rupees === '' ? '0' : d.rupees, paise: '' };
}

export function backspace(d: AmountDraft): AmountDraft {
  if (d.paise !== null) {
    if (d.paise.length > 0) return { ...d, paise: d.paise.slice(0, -1) };
    return { ...d, paise: null };
  }
  return { ...d, rupees: d.rupees.slice(0, -1) };
}

/**
 * Indian digit grouping: the last three digits, then pairs. 7,30,000 — not
 * 730,000.
 *
 * Done by hand rather than through Intl on purpose. The same money code runs in
 * a browser and on Hermes, where the locale data behind en-IN is not guaranteed
 * to be present, and silently falling back to thousands grouping would misstate
 * every amount over a lakh.
 */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * Split for display so the rupee sign and the paise can be sized independently
 * from the rupees.
 */
export function inrParts(paise: number): {
  sign: string;
  rupees: string;
  paise: string;
} {
  const abs = Math.abs(paise);
  return {
    sign: paise < 0 ? '-₹' : '₹',
    rupees: groupIndian(String(Math.floor(abs / 100))),
    paise: String(abs % 100).padStart(2, '0'),
  };
}

/** "₹7,30,000.00" */
export function formatInr(paise: number): string {
  const p = inrParts(paise);
  return `${p.sign}${p.rupees}.${p.paise}`;
}

/** "₹7,30,000" — drops ".00", keeps real paise. For dense lists. */
export function formatInrTrim(paise: number): string {
  const p = inrParts(paise);
  return p.paise === '00'
    ? `${p.sign}${p.rupees}`
    : `${p.sign}${p.rupees}.${p.paise}`;
}

/**
 * Rupees as a plain two-decimal number: no symbol, no grouping, no sign.
 *
 * This is the form a machine reads — the UPI `am` parameter and the amount
 * columns of the CSV export, where "₹7,300.00" would arrive in a
 * spreadsheet as text that will not add up.
 */
export function toDecimalRupees(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(
      `toDecimalRupees needs non-negative integer paise, got ${paise}`
    );
  }
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

/** The `am` value for a UPI intent URI. Always two decimals. */
export function toUpiAmount(paise: number): string {
  return toDecimalRupees(paise);
}

/** Live display of what is being typed, with a caret-friendly trailing dot. */
export function draftDisplay(d: AmountDraft): string {
  if (d.rupees === '' && d.paise === null) return '0';
  const whole = groupIndian(String(Number.parseInt(d.rupees || '0', 10)));
  if (d.paise === null) return whole;
  return `${whole}.${d.paise}`;
}
