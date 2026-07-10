import { describe, it, expect } from 'vitest';
import { getMonthCells } from '../calendarUtils';

describe('getMonthCells', () => {
  it('常に42セル返す', () => {
    expect(getMonthCells(2026, 6)).toHaveLength(42); // 2026年7月
  });
  it('月初が日曜の月は前月端数なしで1日から始まる', () => {
    const cells = getMonthCells(2026, 2); // 2026年3月1日は日曜
    expect(cells[0].date.getDate()).toBe(1);
    expect(cells[0].isCurrentMonth).toBe(true);
  });
  it('年跨ぎ（12月→1月）の端数が正しい', () => {
    const cells = getMonthCells(2026, 11);
    const last = cells[41].date;
    expect(last.getFullYear()).toBe(2027);
    expect(last.getMonth()).toBe(0);
  });
});
