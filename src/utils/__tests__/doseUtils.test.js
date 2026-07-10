import { describe, it, expect } from 'vitest';
import { formatDose, formatDoseStr } from '../doseUtils';

describe('doseUtils', () => {
  it('formatDose should round appropriately', () => {
    // 10未満 -> 小数第1位 (テクベイリ等)
    expect(formatDose(1.23, 'テクベイリ')).toBe(1.2);
    expect(formatDose(1.25, 'テクベイリ')).toBe(1.3);
    
    // 10以上 -> 整数 (テクベイリでも10mg以上なら四捨五入される仕様が現状ならそうなる)
    expect(formatDose(12.3, 'テクベイリ')).toBe(12);
    expect(formatDose(12.5, 'テクベイリ')).toBe(13);

    // テクベイリ等ではない場合 -> 整数
    expect(formatDose(1.23, 'リツキシマブ')).toBe(1); 
  });

  it('formatDoseStr should format with units', () => {
    expect(formatDoseStr(1.23, 'テクベイリ')).toBe('1.2 mg');
    expect(formatDoseStr(5, 'リツキシマブ')).toBe('5 mg');
  });
});
