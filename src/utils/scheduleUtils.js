import { getLocalDateString, parseLocalDate, addDays } from './dateUtils';
import { PROTOCOL_TYPES } from './regimenProtocols';

/**
 * 新規スケジュールを生成する
 * 
 * @param {Object} regimen レジメンオブジェクト
 * @param {string|Date} startDate 開始日 (YYYY-MM-DD または Date)
 * @param {number} startCycle 開始サイクル番号
 * @param {number} startDay 開始日番号 (Day)
 * @returns {Array} 生成されたスケジュール配列
 */
export const generateSchedule = (regimen, startDate, startCycle = 1, startDay = 1) => {
  const isLunsumioMonotherapy = (
    regimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC ||
    regimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV ||
    ['R012', 'R013', 'R9045', 'R6365'].includes(regimen.id) ||
    (
      (regimen.name?.includes('ルンスミオ') || regimen.name?.includes('モスネツズマブ')) &&
      (
        regimen.name?.includes('点滴') || regimen.name?.includes('皮下') ||
        regimen.drugs?.some(d => 
          d.route?.includes('点滴') || 
          d.route?.includes('静脈') || 
          d.route?.includes('皮下')
        )
      ) &&
      (regimen.name?.includes('単剤') || regimen.drugs?.length === 1)
    )
  );

  const schedule = [];
  const start = parseLocalDate(startDate);

  const sCycle = parseInt(startCycle, 10) || 1;
  const sDay = parseInt(startDay, 10) || 1;

  // 指定されたサイクル・Day以降のスケジュールを展開
  const totalCycles = regimen.totalCycles || 4;
  // ルンスミオの場合は初期作成で見込みを含めて17サイクル分生成
  const targetCycles = isLunsumioMonotherapy ? 17 : totalCycles;
  let dayCounter = 0;

  for (let cycle = sCycle; cycle <= targetCycles; cycle++) {
    const initialDay = (cycle === sCycle) ? sDay : 1;
    for (let day = initialDay; day <= regimen.cycleDays; day++) {
      const currentDate = addDays(start, dayCounter);
      dayCounter++;
      const dateString = getLocalDateString(currentDate);
      
      let isDrugDay = false;
      // 各薬剤のapplicableDays/applicableCyclesを動的に判定
      const matchingDrugs = regimen.drugs?.filter(drug => {
        if (drug.applicableCycles && drug.applicableCycles.length > 0) {
          const lookupCycle = (isLunsumioMonotherapy && cycle > 8) ? 8 : cycle;
          if (!drug.applicableCycles.includes(lookupCycle)) return false;
        }
        if (drug.applicableDays && drug.applicableDays.length > 0) {
          return drug.applicableDays.includes(day);
        }
        return regimen.drugDays?.includes(day);
      }) || [];
      isDrugDay = matchingDrugs.length > 0;

      let status = 'none';
      if (isDrugDay) {
        status = (isLunsumioMonotherapy && cycle >= 9) ? 'provisional' : 'pending';
      }

      schedule.push({
        cycleNumber: cycle,
        dayNumber: day,
        absoluteDayNumber: schedule.length + 1,
        date: dateString,
        isDrugDay,
        status
      });
    }
  }

  return { schedule, targetCycles };
};
