import { describe, it, expect } from 'vitest';
import { validatePatients, validateRegimens, validateDrugs, validateFullBackup } from '../importValidation';

describe('importValidation', () => {
  describe('validatePatients', () => {
    it('should validate valid patient data', () => {
      const validPatients = [
        {
          id: 'P001',
          name: '山田 太郎',
          birthDate: '1980-01-01',
          schedule: [{ date: '2026-07-10' }]
        }
      ];
      const result = validatePatients(validPatients);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate missing required fields', () => {
      const invalidPatients = [
        { id: 'P001' } // name, birthDate, schedule missing
      ];
      const result = validatePatients(invalidPatients);
      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('name が空です'),
          expect.stringContaining('birthDate'),
          expect.stringContaining('schedule が配列ではありません')
        ])
      );
    });

    it('should invalidate invalid birthDate', () => {
      const invalidPatients = [
        { id: 'P001', name: 'A', birthDate: '2099-01-01', schedule: [] }
      ];
      const result = validatePatients(invalidPatients);
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('未来日不可');
    });
  });

  describe('validateRegimens', () => {
    it('should validate valid regimen data', () => {
      const validRegimens = [
        {
          id: 'R001',
          name: 'レジメンA',
          drugs: [{ name: '薬剤X', doseValue: 100 }]
        }
      ];
      const result = validateRegimens(validRegimens);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate missing required fields', () => {
      const invalidRegimens = [
        { id: 'R001' } // name, drugs missing
      ];
      const result = validateRegimens(invalidRegimens);
      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('name が空です'),
          expect.stringContaining('drugs が配列ではありません')
        ])
      );
    });
  });

  describe('validateDrugs', () => {
    it('should validate valid drug data', () => {
      const validDrugs = [
        {
          id: 'D001',
          name: '薬剤A',
          route: '点滴静注',
          doseType: 'fixed',
          defaultDoseValue: 100,
          defaultDuration: 60
        }
      ];
      const result = validateDrugs(validDrugs);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate wrong doseType', () => {
      const invalidDrugs = [
        { id: 'D001', name: 'A', route: '点滴静注', doseType: 'invalid' }
      ];
      const result = validateDrugs(invalidDrugs);
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('無効な値です');
    });
  });

  describe('validateFullBackup', () => {
    it('should validate full valid backup', () => {
      const backup = {
        patients: [{ id: 'P001', name: 'A', birthDate: '1980-01-01', schedule: [] }],
        regimens: [{ id: 'R001', name: 'B', drugs: [] }],
        drugs: [{ id: 'D001', name: 'C', route: '点滴静注' }]
      };
      const result = validateFullBackup(backup);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
