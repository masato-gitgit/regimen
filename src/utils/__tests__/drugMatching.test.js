import { describe, it, expect } from 'vitest';
import { getApplicableDrugs } from '../drugMatching';

const tecvayli = [
  { name: 'A', applicableCycles: [1], applicableDays: [1] },
  { name: 'B', applicableCycles: [2, 3], applicableDays: [1, 8] },
];

describe('getApplicableDrugs', () => {
  it('サイクルとDayの両方が一致する薬剤のみ返す', () => {
    expect(getApplicableDrugs(tecvayli, 2, 8)).toHaveLength(1);
    expect(getApplicableDrugs(tecvayli, 1, 8)).toHaveLength(0);
  });
  it('applicableDays未指定なら fallbackDrugDays で判定', () => {
    const drugs = [{ name: 'C' }];
    expect(getApplicableDrugs(drugs, 1, 1, [1, 8])).toHaveLength(1);
    expect(getApplicableDrugs(drugs, 1, 2, [1, 8])).toHaveLength(0);
  });
  it('cycleCap: 9C以降を8C定義で照合（ルンスミオ）', () => {
    const drugs = [{ name: 'D', applicableCycles: [8], applicableDays: [1] }];
    expect(getApplicableDrugs(drugs, 12, 1, [], { cycleCap: 8 })).toHaveLength(1);
  });
});
