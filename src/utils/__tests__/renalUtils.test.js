import { describe, it, expect } from 'vitest';
import { calcAge, calculateEGFR } from '../renalUtils';

describe('renalUtils', () => {
  it('calcAge should calculate age correctly', () => {
    // 基準日を固定してテストするため、現在の年を取得してテストするか、ロジック自体が Date.now() を使うので
    // 一定の幅があるかチェックする
    const birthDate = '1990-01-01';
    const age = calcAge(birthDate);
    expect(typeof age).toBe('number');
    expect(age).toBeGreaterThanOrEqual(30);
  });

  it('calculateEGFR should calculate correctly for male', () => {
    // 男性, 60歳, Cre 1.0 -> 194 * (1.0)^-1.094 * 60^-0.287
    // 現在の年から60年前の誕生日を作成
    const currentYear = new Date().getFullYear();
    const birthDate = `${currentYear - 60}-01-01`;
    const egfr = calculateEGFR(1.0, 'male', birthDate);
    expect(typeof egfr).toBe('number');
    // 大体の値を確認 (59 ~ 61)
    expect(egfr).toBeGreaterThan(50);
    expect(egfr).toBeLessThan(70);
  });

  it('calculateEGFR should calculate correctly for female', () => {
    // 女性, 60歳, Cre 1.0 -> 194 * (1.0)^-1.094 * 60^-0.287 * 0.739
    const currentYear = new Date().getFullYear();
    const birthDate = `${currentYear - 60}-01-01`;
    const egfrM = calculateEGFR(1.0, 'male', birthDate);
    const egfrF = calculateEGFR(1.0, 'female', birthDate);
    expect(egfrF).toBeLessThan(egfrM);
  });

  it('calculateEGFR should return null if missing parameters', () => {
    expect(calculateEGFR(null, 'male', '1990-01-01')).toBeNull();
    expect(calculateEGFR(1.0, 'male', null)).toBeNull();
  });
});
