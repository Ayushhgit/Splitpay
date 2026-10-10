import { describe, expect, it } from 'vitest';
import {
  backspace,
  draftDisplay,
  draftToPaise,
  emptyDraft,
  formatInr,
  formatInrTrim,
  inrParts,
  pushDecimal,
  pushDigit,
  toUpiAmount,
} from '../money';

const type = (keys: string) =>
  [...keys].reduce(
    (d, k) => (k === '.' ? pushDecimal(d) : pushDigit(d, k)),
    emptyDraft
  );

describe('keypad entry', () => {
  it('reads plain rupees', () => {
    expect(draftToPaise(type('7300'))).toBe(730_000);
  });

  it('reads rupees and paise', () => {
    expect(draftToPaise(type('40.01'))).toBe(4_001);
    expect(draftToPaise(type('40.1'))).toBe(4_010);
  });

  it('refuses a leading zero, a second decimal and a third paise digit', () => {
    expect(type('0').rupees).toBe('');
    expect(type('12..5').paise).toBe('5');
    expect(type('12.567').paise).toBe('56');
  });

  it('backspaces out of the paise field and then through the rupees', () => {
    let d = type('12.5');
    d = backspace(d);
    expect(d.paise).toBe('');
    d = backspace(d);
    expect(d.paise).toBeNull();
    expect(draftToPaise(backspace(d))).toBe(100);
  });

  it('shows what is being typed, trailing dot included', () => {
    expect(draftDisplay(emptyDraft)).toBe('0');
    expect(draftDisplay(type('730000'))).toBe('7,30,000');
    expect(draftDisplay(type('12.'))).toBe('12.');
  });
});

describe('formatting', () => {
  it('groups in lakhs, not thousands', () => {
    expect(formatInr(73_000_000)).toBe('₹7,30,000.00');
    expect(inrParts(730_000).rupees).toBe('7,300');
  });

  it('trims a whole-rupee amount but keeps real paise', () => {
    expect(formatInrTrim(730_000)).toBe('₹7,300');
    expect(formatInrTrim(4_001)).toBe('₹40.01');
  });
});

describe('toUpiAmount', () => {
  it('always emits two decimals', () => {
    expect(toUpiAmount(200_000)).toBe('2000.00');
    expect(toUpiAmount(4_001)).toBe('40.01');
    expect(toUpiAmount(4_010)).toBe('40.10');
    expect(toUpiAmount(1)).toBe('0.01');
  });

  it('rejects anything that is not non-negative integer paise', () => {
    expect(() => toUpiAmount(12.5)).toThrow();
    expect(() => toUpiAmount(-100)).toThrow();
  });
});
