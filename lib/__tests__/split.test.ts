import { describe, expect, it } from 'vitest';
import { MDR } from '../mdr';
import { type SplitMode, splitSale } from '../split';

const amounts = (totalPaise: number, mode: SplitMode) =>
  splitSale(totalPaise, mode).legs.map((l) => l.amountPaise);

describe('the exempt boundary', () => {
  it('leaves Rs 2,000 alone — it is the largest exempt leg', () => {
    const r = splitSale(200_000, 'maxfill');
    expect(r.legCount).toBe(1);
    expect(r.isSplit).toBe(false);
    expect(r.savingPaise).toBe(0);
  });

  it('splits Rs 2,000.01 into two', () => {
    expect(amounts(200_001, 'maxfill')).toEqual([200_000, 1]);
    expect(splitSale(200_001, 'maxfill').savingPaise).toBe(800);
  });
});

describe('max-fill', () => {
  it('turns Rs 7,300 into 2000 / 2000 / 2000 / 1300', () => {
    expect(amounts(730_000, 'maxfill')).toEqual([
      200_000, 200_000, 200_000, 130_000,
    ]);
  });

  it('leaves no remainder leg when the total divides exactly', () => {
    expect(amounts(600_000, 'maxfill')).toEqual([200_000, 200_000, 200_000]);
  });

  it('will emit a one-paisa remainder leg rather than round', () => {
    expect(amounts(400_100, 'maxfill')).toEqual([200_000, 200_000, 100]);
  });
});

describe('equal', () => {
  it('evens Rs 4,001 to 1333.67 / 1333.67 / 1333.66', () => {
    expect(amounts(400_100, 'equal')).toEqual([133_367, 133_367, 133_366]);
  });

  it('uses the same leg count as max-fill', () => {
    for (const total of [200_001, 400_100, 730_000, 7_500_000, 10_000_000]) {
      expect(splitSale(total, 'equal').legCount).toBe(
        splitSale(total, 'maxfill').legCount
      );
    }
  });
});

describe('savings', () => {
  it('reports the whole MDR as saved, with GST shown apart', () => {
    const r = splitSale(730_000, 'maxfill');
    expect(r.unsplitMdrPaise).toBe(2_920);
    expect(r.splitMdrPaise).toBe(0);
    expect(r.savingPaise).toBe(2_920);
    expect(r.gstOnSavedMdrPaise).toBe(526);
  });

  it('thins out per scan once the Rs 300 cap engages', () => {
    const atCap = splitSale(7_500_000, 'maxfill');
    expect(atCap.savingPaise).toBe(30_000);
    expect(atCap.legCount).toBe(38);
    expect(atCap.savingPerLegPaise).toBe(789); // Rs 7.89 a scan

    const lakh = splitSale(10_000_000, 'maxfill');
    expect(lakh.legCount).toBe(50);
    expect(lakh.savingPerLegPaise).toBe(600); // Rs 6.00 a scan
  });

  it('saves nothing on a sale that was never chargeable', () => {
    expect(splitSale(150_000, 'maxfill').savingPaise).toBe(0);
  });
});

describe('invariants hold across the range', () => {
  const totals = [
    0, 1, 100, 199_999, 200_000, 200_001, 250_000, 400_100, 730_000, 999_999,
    7_499_900, 7_500_000, 10_000_000, 25_000_001,
  ];

  for (const mode of ['maxfill', 'equal'] as SplitMode[]) {
    it(`${mode}: legs add up and none is chargeable`, () => {
      for (const total of totals) {
        const r = splitSale(total, mode);
        const sum = r.legs.reduce((s, l) => s + l.amountPaise, 0);
        expect(sum).toBe(total);
        expect(r.legs.every((l) => Number.isInteger(l.amountPaise))).toBe(true);
        if (r.isSplit) {
          expect(
            r.legs.every((l) => l.amountPaise <= MDR.exemptUpToPaise)
          ).toBe(true);
          expect(r.splitMdrPaise).toBe(0);
        }
        expect(r.legs.map((l) => l.seq)).toEqual(
          r.legs.map((_, i) => i + 1)
        );
      }
    });
  }

  it('rejects junk input instead of guessing', () => {
    expect(() => splitSale(-1, 'maxfill')).toThrow();
    expect(() => splitSale(12.5, 'maxfill')).toThrow();
  });
});
