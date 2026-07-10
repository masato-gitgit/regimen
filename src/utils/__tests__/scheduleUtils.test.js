import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../scheduleUtils';
import { getLocalDateString } from '../dateUtils';

describe('scheduleUtils', () => {
  it('should generate correct schedule for 21-day cycle x 8 cycles', () => {
    const regimen = {
      id: 'test-001',
      name: 'テストレジメン 21日x8',
      cycleDays: 21,
      totalCycles: 8,
      drugs: [
        { name: '薬剤A', applicableDays: [1, 8] },
        { name: '薬剤B', applicableDays: [1] }
      ]
    };

    // 2026-01-01 を開始日とする
    const startDate = '2026-01-01';
    const { schedule } = generateSchedule(regimen, startDate, 1, 1);

    // 21日 x 8サイクル = 168日分のスケジュールが生成されるはず
    expect(schedule.length).toBe(168);

    // サイクル1 Day1
    expect(schedule[0].cycleNumber).toBe(1);
    expect(schedule[0].dayNumber).toBe(1);
    expect(schedule[0].date).toBe('2026-01-01');
    expect(schedule[0].isDrugDay).toBe(true);
    

    // サイクル1 Day8
    expect(schedule[7].cycleNumber).toBe(1);
    expect(schedule[7].dayNumber).toBe(8);
    expect(schedule[7].date).toBe('2026-01-08');
    expect(schedule[7].isDrugDay).toBe(true);
    

    // サイクル1 Day2
    expect(schedule[1].isDrugDay).toBe(false);
    

    // サイクル2 Day1 (21日後)
    expect(schedule[21].cycleNumber).toBe(2);
    expect(schedule[21].dayNumber).toBe(1);
    expect(schedule[21].date).toBe('2026-01-22'); // 01-01の21日後は01-22
    expect(schedule[21].isDrugDay).toBe(true);
    

    // 最後のスケジュール (サイクル8 Day21)
    const lastItem = schedule[schedule.length - 1];
    expect(lastItem.cycleNumber).toBe(8);
    expect(lastItem.dayNumber).toBe(21);
    expect(lastItem.isDrugDay).toBe(false);
  });
});
