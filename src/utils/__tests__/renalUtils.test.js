import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calcAge, calculateEGFR } from '../renalUtils';

describe('renalUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1)); // 2024年1月1日
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calcAge should calculate age correctly', () => {
    const birthDate = '1990-01-01'; // 2024-1990 = 34
    const age = calcAge(birthDate);
    expect(typeof age).toBe('number');
    expect(age).toBe(34);
  });

  it('calculateEGFR should calculate correctly for male', () => {
    // 男性, 60歳, Cre 1.0 -> 194 * (1.0)^-1.094 * 60^-0.287
    // 2024年から60年前 -> 1964年
    const birthDate = '1964-01-01';
    const egfr = calculateEGFR(1.0, 'male', birthDate);
    expect(typeof egfr).toBe('number');
    // eGFR = 194 * 1.0^-1.094 * 60^-0.287 ≈ 59.91
    expect(egfr).toBeCloseTo(59.91, 1);
  });

  it('calculateEGFR should calculate correctly for female', () => {
    // 女性, 60歳, Cre 1.0
    const birthDate = '1964-01-01';
    const egfrM = calculateEGFR(1.0, 'male', birthDate);
    const egfrF = calculateEGFR(1.0, 'female', birthDate);
    expect(egfrF).toBeLessThan(egfrM);
    // 女性の係数 0.739: 59.906 * 0.739 ≈ 44.27
    expect(egfrF).toBeCloseTo(44.27, 1);
  });

  it('calculateEGFR should return null if missing parameters', () => {
    expect(calculateEGFR(null, 'male', '1990-01-01')).toBeNull();
    expect(calculateEGFR(1.0, 'male', null)).toBeNull();
  });
});
