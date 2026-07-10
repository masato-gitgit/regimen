import { describe, it, expect } from 'vitest';
import { applyTecvayliRestart, applyLunsumioRestart, applyTalquetamabRestart } from '../protocolActions';
import { getLocalDateString } from '../dateUtils';

describe('protocolActions', () => {
  describe('applyTecvayliRestart', () => {
    it('should correctly rebuild schedule for 0.06mg dose restart', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-04', dayNumber: 4, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' }, // to be replaced
      ];

      // 7月10日に 0.06mg で再開
      const result = applyTecvayliRestart(schedule, '2026-07-10', 0.06);

      // 過去分2日 + 新たな5日 (Day1,4,8,15,22) = 7件になるはず
      expect(result.length).toBe(7);

      // 新しい予定のDay1は7月10日
      expect(result[2].date).toBe('2026-07-10');
      expect(result[2].dayNumber).toBe(1);

      // Day4 は +3日 (7月13日)
      expect(result[3].date).toBe('2026-07-13');
      expect(result[3].dayNumber).toBe(4);

      // Day22 は +21日 (7月31日)
      expect(result[6].date).toBe('2026-07-31');
      expect(result[6].dayNumber).toBe(22);
    });

    it('should correctly rebuild schedule for 0.3mg dose restart', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' },
      ];
      // 0.3mg で再開すると Day4, 8, 15, 22 が再構築される
      const result = applyTecvayliRestart(schedule, '2026-07-10', 0.3);
      expect(result.length).toBe(5); // completed(1) + 4
      
      expect(result[1].date).toBe('2026-07-10');
      expect(result[1].dayNumber).toBe(4);
      
      expect(result[2].date).toBe('2026-07-14'); // +4日
      expect(result[2].dayNumber).toBe(8);
    });

    it('should return the same schedule for 1.5mg dose restart', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' },
      ];
      const result = applyTecvayliRestart(schedule, '2026-07-10', 1.5);
      expect(result).toEqual(schedule);
    });
  });

  describe('applyLunsumioRestart', () => {
    it('should rebuild lunsumio schedule starting from 1C Day1', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' }, // to be replaced
      ];

      // 7月10日に再開
      const result = applyLunsumioRestart(schedule, '2026-07-10');

      // 過去1件 + 8サイクル(21日*8 = 168日) = 169件
      expect(result.length).toBe(169);

      // Day1 は 7月10日
      expect(result[1].date).toBe('2026-07-10');
      expect(result[1].dayNumber).toBe(1);
      expect(result[1].isDrugDay).toBe(true);

      // 1C Day8 は +7日 (7月17日)
      expect(result[8].date).toBe('2026-07-17');
      expect(result[8].dayNumber).toBe(8);
      expect(result[8].isDrugDay).toBe(true);

      // 2C Day1 は +21日 (7月31日)
      expect(result[22].date).toBe('2026-07-31');
      expect(result[22].dayNumber).toBe(1);
      expect(result[22].isDrugDay).toBe(true);
    });
  });

  describe('applyTalquetamabRestart', () => {
    it('should correctly rebuild schedule for 0.01mg dose restart (Weekly)', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' },
      ];
      const result = applyTalquetamabRestart(schedule, '2026-07-10', 0.01, true);
      // completed(1) + 10 cycles (10 * 7 = 70 days) = 71
      expect(result.length).toBe(71);
      
      expect(result[1].date).toBe('2026-07-10');
      expect(result[1].dayNumber).toBe(1);
      expect(result[1].isDrugDay).toBe(true);
    });

    it('should correctly rebuild schedule for 0.3mg dose restart (Biweekly)', () => {
      const schedule = [
        { date: '2026-07-01', dayNumber: 1, cycleNumber: 1, status: 'completed' },
        { date: '2026-07-10', dayNumber: 8, cycleNumber: 1, status: 'pending' },
      ];
      const result = applyTalquetamabRestart(schedule, '2026-07-10', 0.3, false);
      // completed(1) + (14 - 7) days of cycle 1 (7 days) + 7 cycles (7 * 14 = 98 days) = 106
      expect(result.length).toBe(106);
      
      expect(result[1].date).toBe('2026-07-10');
      expect(result[1].dayNumber).toBe(8);
      expect(result[1].isDrugDay).toBe(true);
      expect(result[2].date).toBe('2026-07-11');
      expect(result[2].dayNumber).toBe(9);
      expect(result[2].isDrugDay).toBe(false);
    });
  });
});
