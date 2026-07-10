import { describe, it, expect } from 'vitest';
import { getJapaneseHoliday } from '../holidayUtils';

describe('holidayUtils', () => {
  it('should return holiday name for fixed holidays', () => {
    expect(getJapaneseHoliday(new Date(2023, 0, 1))).toBe('元日');
    expect(getJapaneseHoliday(new Date(2023, 1, 11))).toBe('建国記念の日');
    expect(getJapaneseHoliday(new Date(2023, 4, 3))).toBe('憲法記念日');
  });

  it('should return holiday name for happy mondays', () => {
    // 2023成人の日は1月9日
    expect(getJapaneseHoliday(new Date(2023, 0, 9))).toBe('成人の日');
    // 2023海の日は7月17日
    expect(getJapaneseHoliday(new Date(2023, 6, 17))).toBe('海の日');
  });

  it('should handle hospital specific holidays', () => {
    expect(getJapaneseHoliday(new Date(2023, 4, 1))).toBe('休日'); // 5月1日
    expect(getJapaneseHoliday(new Date(2023, 11, 29))).toBe('年末年始休暇');
    expect(getJapaneseHoliday(new Date(2023, 11, 31))).toBe('年末年始休暇');
  });

  it('should return null for normal days', () => {
    expect(getJapaneseHoliday(new Date(2023, 0, 5))).toBeNull();
  });
});
