/**
 * drugMatching.js
 * 「このサイクル・このDayにどの薬剤を投与するか」の判定を一元化する。
 * ⚠️ この判定はカレンダー表示・スケジュール生成・チェックリスト・
 *    薬剤集計のすべてに影響するため、変更時は必ずテストを更新すること。
 */

/**
 * 指定サイクル・Day に適用される薬剤を抽出する。
 * @param {Array}  drugs            - 薬剤定義配列（regimen.drugs / activeRegimen.drugs）
 * @param {number} cycleNumber      - サイクル番号 (1〜)
 * @param {number} dayNumber        - Day 番号 (1〜)
 * @param {number[]} [fallbackDrugDays=[]] - applicableDays 未指定時のレジメン共通投与日
 * @param {object} [options]
 * @param {number} [options.cycleCap] - これを超えるサイクルは cap 値として照合する
 *                                      （ルンスミオ9C以降を8C定義で照合する用途）
 * @returns {Array} 適用薬剤の配列
 */
export const getApplicableDrugs = (drugs, cycleNumber, dayNumber, fallbackDrugDays = [], options = {}) => {
  if (!Array.isArray(drugs)) return [];
  const lookupCycle = (options.cycleCap && cycleNumber > options.cycleCap)
    ? options.cycleCap
    : cycleNumber;

  return drugs.filter(drug => {
    if (drug.applicableCycles?.length > 0 && !drug.applicableCycles.includes(lookupCycle)) {
      return false;
    }
    if (drug.applicableDays?.length > 0) {
      return drug.applicableDays.includes(dayNumber);
    }
    return fallbackDrugDays?.includes(dayNumber) ?? false;
  });
};
