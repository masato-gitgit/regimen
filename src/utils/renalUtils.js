/**
 * renalUtils.js
 * 腎機能計算に関する共通ユーティリティ
 *
 * 使用式: 日本腎臓学会推奨の日本人向けeGFR推算式
 *   eGFR (mL/min/1.73m²) = 194 × Cr^-1.094 × Age^-0.287
 *   女性の場合はさらに × 0.739
 */

/**
 * 生年月日文字列から現在の年齢（整数）を返す。
 * @param {string} birthDateStr - "YYYY-MM-DD" 形式の生年月日
 * @returns {number} 年齢（才）。計算不能な場合は 0
 */
export const calcAge = (birthDateStr) => {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
};

/**
 * eGFR を計算して返す（日本腎臓学会の日本人向け推算式）。
 *
 * @param {number|string} creatinine - 血清クレアチニン値 (mg/dL)
 * @param {'male'|'female'} gender   - 性別
 * @param {string} birthDateStr      - "YYYY-MM-DD" 形式の生年月日
 * @returns {number|null} eGFR (mL/min/1.73m²) を小数第1位で丸めた値。
 *                        計算不能な場合は null を返す。
 */
export const calculateEGFR = (creatinine, gender, birthDateStr) => {
  if (!creatinine || !birthDateStr) return null;
  const cr = parseFloat(creatinine);
  const age = calcAge(birthDateStr);
  if (isNaN(cr) || cr <= 0 || age <= 0) return null;

  // 日本人 eGFR 推算式: 194 × Cr^-1.094 × Age^-0.287
  let egfr = 194 * Math.pow(cr, -1.094) * Math.pow(age, -0.287);

  // 女性係数
  if (gender === 'female') {
    egfr = egfr * 0.739;
  }

  return Math.round(egfr * 10) / 10;
};

/**
 * eGFR 値から CKD ステージ文字列を返す（参考用）。
 * @param {number|null} egfr
 * @returns {string}
 */
export const ckdStage = (egfr) => {
  if (egfr === null || egfr === undefined) return '---';
  if (egfr >= 90) return 'G1';
  if (egfr >= 60) return 'G2';
  if (egfr >= 45) return 'G3a';
  if (egfr >= 30) return 'G3b';
  if (egfr >= 15) return 'G4';
  return 'G5';
};
