import { getLocalDateString, parseLocalDate, addDays } from './dateUtils';
import { getApplicableDrugs } from './drugMatching';
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
    regimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV
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
      const matchingDrugs = getApplicableDrugs(
        regimen.drugs, 
        cycle, 
        day, 
        regimen.drugDays, 
        { cycleCap: isLunsumioMonotherapy ? 8 : undefined }
      );
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

/**
 * 患者の「今日の投与ステータス」を schedule から導出する。
 * @returns {'none'|'pending'|'running'|'completed'|'provisional'} 
 *   今日が投与日でなければ 'none'
 */
export const getTodayStatus = (patient, todayStr = getLocalDateString()) => {
  if (!patient || !patient.schedule) return 'none';
  const item = patient.schedule.find(s => s.date === todayStr && s.isDrugDay);
  return item ? (item.status || 'pending') : 'none';
};
