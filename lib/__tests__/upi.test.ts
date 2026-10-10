import { describe, expect, it } from 'vitest';
import {
  buildUpiUri,
  isValidVpa,
  legNote,
  legRef,
  newSaleShortId,
  sanitiseNote,
} from '../upi';

const payee = { vpa: 'shop@okhdfcbank', payeeName: 'Verma Electronics' };

describe('isValidVpa', () => {
  it('accepts real handles and rejects malformed ones', () => {
    expect(isValidVpa('shop@okhdfcbank')).toBe(true);
    expect(isValidVpa('verma.electronics-1@ybl')).toBe(true);
    expect(isValidVpa('shop')).toBe(false);
    expect(isValidVpa('shop@')).toBe(false);
    expect(isValidVpa('@ybl')).toBe(false);
    expect(isValidVpa('shop@ybl.com')).toBe(false);
    expect(isValidVpa('sh op@ybl')).toBe(false);
  });
});

describe('legNote', () => {
  it('names one invoice and the leg position inside it', () => {
    expect(legNote('INV1042', 2, 4)).toBe('INV1042 2/4');
  });

  it('strips characters some PSPs reject and stays under 50 chars', () => {
    expect(sanitiseNote('INV#1042 (part 2) & more')).toBe(
      'INV 1042 part 2 more'
    );
    expect(sanitiseNote('x'.repeat(80)).length).toBe(50);
  });
});

describe('legRef', () => {
  it('zero-pads the sequence and uppercases', () => {
    expect(legRef('7k3q2w', 1)).toBe('7K3Q2W01');
    expect(legRef('7k3q2w', 12)).toBe('7K3Q2W12');
  });

  it('is unique per leg of a sale', () => {
    const id = newSaleShortId();
    const refs = Array.from({ length: 50 }, (_, i) => legRef(id, i + 1));
    expect(new Set(refs).size).toBe(50);
    expect(refs.every((r) => r.length <= 35)).toBe(true);
  });

  it('rejects a short id carrying illegal characters', () => {
    expect(() => legRef('ab-cd', 1)).toThrow();
  });
});

describe('newSaleShortId', () => {
  it('is six vowel-free base32 characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(newSaleShortId()).toMatch(/^[0-9BCDFGHJKLMNPQRSTVWXYZ]{6}$/);
    }
  });
});

describe('buildUpiUri', () => {
  const uri = buildUpiUri({
    payee,
    amountPaise: 200_000,
    note: legNote('INV1042', 2, 4),
    ref: 'M7K3Q202',
  });

  it('carries the amount with two decimals and the currency', () => {
    expect(uri).toContain('am=2000.00');
    expect(uri).toContain('cu=INR');
  });

  it('encodes spaces as %20, never as +', () => {
    expect(uri).toContain('pn=Verma%20Electronics');
    expect(uri).toContain('tn=INV1042%202%2F4');
    expect(uri).not.toContain('+');
  });

  it('starts with the upi intent scheme', () => {
    expect(uri.startsWith('upi://pay?pa=shop%40okhdfcbank')).toBe(true);
  });

  it('refuses to build against an invalid VPA', () => {
    expect(() =>
      buildUpiUri({
        payee: { vpa: 'nope', payeeName: 'X' },
        amountPaise: 100,
        note: 'x',
        ref: 'A1',
      })
    ).toThrow();
  });
});
