import { describe, it, expect } from 'vitest';
import { generateSchedule, getTodayStatus } from '../scheduleUtils';
import { getLocalDateString } from '../dateUtils';

describe('scheduleUtils', () => {
  it('should derive todayStatus correctly using getTodayStatus', () => {
    const mockPatient = {
      schedule: [
        { date: '2026-07-10', isDrugDay: true, status: 'completed' },
        { date: '2026-07-11', isDrugDay: false },
        { date: '2026-07-12', isDrugDay: true, status: 'pending' },
        { date: '2026-07-13', isDrugDay: true } // status undefined (defaults to pending)
      ]
    };

    // 1. 今日が投与日で、ステータスが completed
    expect(getTodayStatus(mockPatient, '2026-07-10')).toBe('completed');

    // 2. 今日が非投与日
    expect(getTodayStatus(mockPatient, '2026-07-11')).toBe('none');

    // 3. 今日が投与日で、ステータスが pending (日付を跨いだケースなど)
    expect(getTodayStatus(mockPatient, '2026-07-12')).toBe('pending');

    // 4. status が未定義の投与日
    expect(getTodayStatus(mockPatient, '2026-07-13')).toBe('pending');

    // 5. schedule が空、あるいは存在しない日付
    expect(getTodayStatus(mockPatient, '2026-08-01')).toBe('none');
    expect(getTodayStatus({ schedule: [] }, '2026-07-10')).toBe('none');
    expect(getTodayStatus({}, '2026-07-10')).toBe('none');
    expect(getTodayStatus(null, '2026-07-10')).toBe('none');
  });

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

  it('should generate correct schedule for Lunsumio (17 cycles)', () => {
    const lunsumioRegimen = {
      id: 'lunsumio-001',
      name: 'ルンスミオ (17サイクル)',
      cycleDays: 21,
      totalCycles: 17,
      drugs: [
        { 
          name: 'モスネツズマブ', 
          applicableCycles: [1], 
          applicableDays: [1, 8, 15] 
        },
        { 
          name: 'モスネツズマブ', 
          applicableCycles: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], 
          applicableDays: [1] 
        }
      ]
    };

    const { schedule } = generateSchedule(lunsumioRegimen, '2026-01-01', 1, 1);
    // 21 days * 17 cycles = 357 days
    expect(schedule.length).toBe(357);

    // C1 Day1, 8, 15 are drug days
    expect(schedule.find(s => s.cycleNumber === 1 && s.dayNumber === 1).isDrugDay).toBe(true);
    expect(schedule.find(s => s.cycleNumber === 1 && s.dayNumber === 8).isDrugDay).toBe(true);
    expect(schedule.find(s => s.cycleNumber === 1 && s.dayNumber === 15).isDrugDay).toBe(true);
    expect(schedule.find(s => s.cycleNumber === 1 && s.dayNumber === 2).isDrugDay).toBe(false);

    // C2 Day1 is drug day, Day8 is not
    expect(schedule.find(s => s.cycleNumber === 2 && s.dayNumber === 1).isDrugDay).toBe(true);
    expect(schedule.find(s => s.cycleNumber === 2 && s.dayNumber === 8).isDrugDay).toBe(false);

    // C17 Day1 is drug day
    expect(schedule.find(s => s.cycleNumber === 17 && s.dayNumber === 1).isDrugDay).toBe(true);
  });
});
