import { describe, it, expect } from 'vitest';
import { getLocalDateString, parseLocalDate, addDays, getNextWeekday } from '../dateUtils';

describe('dateUtils', () => {
  it('getLocalDateString should return YYYY-MM-DD in local time', () => {
    // 日本時間の2023-01-01 12:00
    const date = new Date('2023-01-01T12:00:00+09:00');
    expect(getLocalDateString(date)).toBe('2023-01-01');
  });

  it('parseLocalDate should parse YYYY-MM-DD correctly', () => {
    const date = parseLocalDate('2023-01-01');
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(0); // 1月
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it('addDays should add correct number of days', () => {
    const date = parseLocalDate('2023-01-01');
    const added = addDays(date, 5);
    expect(getLocalDateString(added)).toBe('2023-01-06');
  });


});
