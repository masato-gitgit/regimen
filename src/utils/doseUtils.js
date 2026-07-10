/**
 * doseUtils.js
 * 薬剤投与量の計算・表示に関する共通ユーティリティ
 *
 * 丸めルール:
 *   - テクベイリ（テクラスタマブ）の計算値が 10mg 未満  → 小数第1位まで（例: 0.6 mg, 3.2 mg）
 *   - それ以外のすべての薬剤                            → 整数（例: 120 mg, 480 mg）
 */

import { isMicroDoseProtocol } from './regimenProtocols';

/** 10mg 未満のステップアップ期対象薬剤を判定する */
export const isMicroDoseDrug = (drugName) => {
  return isMicroDoseProtocol(null, drugName);
};

/**
 * 薬剤投与量を「表示用数値」に丸めて返す。
 * @param {number} rawDose  - BSA/体重計算後の生の計算値
 * @param {string} drugName - 薬剤名（丸めルール判定に使用）
 * @returns {number} 丸め済みの投与量数値
 */
export const formatDose = (rawDose, drugName) => {
  if (!rawDose && rawDose !== 0) return 0;
  if (isMicroDoseDrug(drugName) && rawDose < 10) {
    return Math.round(rawDose * 10) / 10;
  }
  return Math.round(rawDose);
};

/**
 * 薬剤投与量を「表示用文字列」に変換して返す（単位 mg 付き）。
 * @param {number} rawDose  - BSA/体重計算後の生の計算値
 * @param {string} drugName - 薬剤名
 * @returns {string} 例: "0.6 mg", "120 mg"
 */
export const formatDoseStr = (rawDose, drugName) => {
  const v = formatDose(rawDose, drugName);
  // 小数表示が必要な場合は toFixed(1)、整数の場合はそのまま
  if (isMicroDoseDrug(drugName) && rawDose < 10) {
    return `${v.toFixed(1)} mg`;
  }
  return `${v} mg`;
};

/**
 * レジメン定義の drug オブジェクトと患者データから計算済みの投与量数値を返す。
 * @param {object} drug    - レジメン薬剤定義 { doseValue, doseType, name }
 * @param {object} patient - 患者データ { bsa, weight }
 * @returns {number} 丸め済みの投与量数値
 */
export const calcAndFormatDose = (drug, patient) => {
  if (!drug || !patient) return 0;
  let raw = 0;
  if (drug.doseType === 'bsa') {
    raw = drug.doseValue * (patient.bsa || 0);
  } else if (drug.doseType === 'weight') {
    raw = drug.doseValue * (patient.weight || 0);
  } else {
    raw = drug.doseValue;
  }
  return formatDose(raw, drug.name);
};

/**
 * calcAndFormatDose の文字列版（単位 mg 付き）。
 */
export const calcAndFormatDoseStr = (drug, patient) => {
  if (!drug || !patient) return '0 mg';
  let raw = 0;
  if (drug.doseType === 'bsa') {
    raw = drug.doseValue * (patient.bsa || 0);
  } else if (drug.doseType === 'weight') {
    raw = drug.doseValue * (patient.weight || 0);
  } else {
    raw = drug.doseValue;
  }
  return formatDoseStr(raw, drug.name);
};
