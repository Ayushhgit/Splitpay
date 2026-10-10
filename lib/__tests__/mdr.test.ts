import { describe, expect, it } from 'vitest';
import { MDR, gstOnMdr, mdrFor, minLegsFor } from '../mdr';

describe('mdrFor', () => {
  it('charges nothing at or below the Rs 2,000 band', () => {
    expect(mdrFor(0)).toBe(0);
    expect(mdrFor(1)).toBe(0);
    expect(mdrFor(100_000)).toBe(0);
    expect(mdrFor(MDR.exemptUpToPaise)).toBe(0);
  });

  it('starts charging one paisa above Rs 2,000', () => {
    expect(mdrFor(200_001)).toBe(800);
  });

  it('charges 0.4% in the normal range', () => {
    expect(mdrFor(500_000)).toBe(2_000); // Rs 5,000 -> Rs 20
    expect(mdrFor(730_000)).toBe(2_920); // Rs 7,300 -> Rs 29.20
  });

  it('charges below the cap up to Rs 70,000', () => {
    expect(mdrFor(7_000_000)).toBe(28_000); // Rs 70,000 -> Rs 280
  });

  it('caps at Rs 300 from Rs 74,998.75, where rounding reaches the ceiling', () => {
    expect(mdrFor(7_499_874)).toBe(29_999);
    expect(mdrFor(7_499_875)).toBe(MDR.capPaise);
    expect(mdrFor(7_500_000)).toBe(MDR.capPaise);
    expect(mdrFor(10_000_000)).toBe(MDR.capPaise);
    expect(mdrFor(50_000_000)).toBe(MDR.capPaise);
  });
});

describe('gstOnMdr', () => {
  it('is 18% of the fee, not of the sale', () => {
    expect(gstOnMdr(2_920)).toBe(526); // Rs 29.20 -> Rs 5.26
    expect(gstOnMdr(0)).toBe(0);
  });
});

describe('minLegsFor', () => {
  it('needs one leg up to Rs 2,000 and two just past it', () => {
    expect(minLegsFor(200_000)).toBe(1);
    expect(minLegsFor(200_001)).toBe(2);
  });

  it('needs 38 legs for Rs 75,000 and 50 for Rs 1 lakh', () => {
    expect(minLegsFor(7_500_000)).toBe(38);
    expect(minLegsFor(10_000_000)).toBe(50);
  });
});
