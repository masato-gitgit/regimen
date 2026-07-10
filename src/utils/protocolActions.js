import { parseLocalDate, addDays, getLocalDateString } from './dateUtils';

/**
 * テクベイリ再開プロトコル適用
 */
export const applyTecvayliRestart = (schedule, targetDateStr, targetDoseValue) => {
  const targetIdx = schedule.findIndex(s => s.date === targetDateStr);
  if (targetIdx === -1) return schedule;

  const completedPart = schedule.slice(0, targetIdx);
  const baseDate = parseLocalDate(targetDateStr);

  let offsetDaysList = [];
  let dayNumbersList = [];

  if (targetDoseValue === 0.06) {
    offsetDaysList = [0, 3, 7, 14, 21];
    dayNumbersList = [1, 4, 8, 15, 22];
  } else if (targetDoseValue === 0.3) {
    offsetDaysList = [0, 4, 11, 18];
    dayNumbersList = [4, 8, 15, 22];
  } else {
    // 1.5mg/kgの場合は現状特別なスケジュール再構成はなし（そのまま）
    return schedule;
  }

  const newFutureItems = offsetDaysList.map((offset, i) => {
    const d = addDays(baseDate, offset);
    return {
      date: getLocalDateString(d),
      dayNumber: dayNumbersList[i],
      isDrugDay: true,
      status: 'pending'
    };
  });

  return [...completedPart, ...newFutureItems];
};

/**
 * ルンスミオ皮下注再開プロトコル適用
 */
export const applyLunsumioRestart = (schedule, targetDateStr) => {
  const targetIdx = schedule.findIndex(s => s.date === targetDateStr);
  if (targetIdx === -1) return schedule;

  const completedPart = schedule.slice(0, targetIdx);
  const baseDate = parseLocalDate(targetDateStr);

  const newFutureItems = [];
  let dayCounter = 0;
  
  for (let cycle = 1; cycle <= 8; cycle++) {
    for (let day = 1; day <= 21; day++) {
      dayCounter++;
      const currentDate = addDays(baseDate, dayCounter - 1);
      const dateString = getLocalDateString(currentDate);
      
      let isDrugDay = false;
      if (cycle === 1) {
        isDrugDay = [1, 8, 15].includes(day);
      } else {
        isDrugDay = (day === 1);
      }

      newFutureItems.push({
        cycleNumber: cycle,
        dayNumber: day,
        absoluteDayNumber: dayCounter + completedPart.length,
        date: dateString,
        isDrugDay,
        status: isDrugDay ? 'pending' : 'none'
      });
    }
  }

  return [...completedPart, ...newFutureItems];
};

/**
 * タービー再開プロトコル適用
 */
export const applyTalquetamabRestart = (schedule, targetDateStr, targetDoseValue, isWeekly) => {
  const targetIdx = schedule.findIndex(s => s.date === targetDateStr);
  if (targetIdx === -1) return schedule;

  const completedPart = schedule.slice(0, targetIdx);
  const baseDate = parseLocalDate(targetDateStr);

  const newFutureItems = [];
  let dayCounter = 0;
  
  let startCycle = 1;
  let startDay = 1;
  
  if (targetDoseValue === 0.01) {
    startCycle = 1; startDay = 1;
  } else if (targetDoseValue === 0.06) {
    startCycle = 1; startDay = 4;
  } else if (targetDoseValue === 0.3) {
    if (isWeekly) {
      startCycle = 1; startDay = 7;
    } else {
      startCycle = 1; startDay = 8;
    }
  } else if (targetDoseValue === 0.4) {
    startCycle = 1; startDay = 7;
  } else if (targetDoseValue === 0.8) {
    startCycle = 1; startDay = 11;
  }

  const totalCycles = isWeekly ? 10 : 8;
  const cycleDays = isWeekly ? 7 : 14;

  for (let cycle = startCycle; cycle <= totalCycles; cycle++) {
    const cycleStart = (cycle === startCycle) ? startDay : 1;
    for (let day = cycleStart; day <= cycleDays; day++) {
      dayCounter++;
      const currentDate = addDays(baseDate, dayCounter - 1);
      const dateString = getLocalDateString(currentDate);
      
      let isDrugDay = false;
      if (isWeekly) {
        if (cycle === 1) {
          isDrugDay = [1, 4, 7].includes(day);
        } else {
          isDrugDay = (day === 1);
        }
      } else {
        if (cycle === 1) {
          isDrugDay = [1, 4, 8, 11].includes(day);
        } else {
          isDrugDay = (day === 1);
        }
      }

      newFutureItems.push({
        cycleNumber: cycle,
        dayNumber: day,
        absoluteDayNumber: dayCounter + completedPart.length,
        date: dateString,
        isDrugDay,
        status: isDrugDay ? 'pending' : 'none'
      });
    }
  }

  return [...completedPart, ...newFutureItems];
};

/**
 * テクベイリ単独療法の投与間隔変更（2週間隔⇔1週間隔）
 */
export const changeTecvayliInterval = (schedule, targetDateStr, intervalWeeks) => {
  const targetIdx = schedule.findIndex(s => s.date === targetDateStr);
  if (targetIdx === -1) return schedule;

  const completedPart = schedule.slice(0, targetIdx);
  const futurePart = schedule.slice(targetIdx);
  const baseDate = parseLocalDate(targetDateStr);
  
  const updatedFuture = [];
  let currentOffset = 0;
  
  for (let i = 0; i < futurePart.length; i++) {
    const origItem = futurePart[i];
    const currentDate = addDays(baseDate, currentOffset);
    const dateString = getLocalDateString(currentDate);
    
    let isDrugDay = false;
    if (intervalWeeks === 2) {
      isDrugDay = (origItem.dayNumber === 1 || origItem.dayNumber === 15);
    } else {
      isDrugDay = (origItem.dayNumber === 1 || origItem.dayNumber === 8 || origItem.dayNumber === 15 || origItem.dayNumber === 22);
    }
    
    updatedFuture.push({
      ...origItem,
      date: dateString,
      isDrugDay,
      status: isDrugDay ? 'pending' : 'none'
    });
    
    currentOffset++;
  }
  
  return [...completedPart, ...updatedFuture];
};

/**
 * タービー・テクベイリ併用療法の投与間隔変更（4週間隔⇔2週間隔）
 */
export const changeCombinationInterval = (schedule, targetDateStr, intervalWeeks) => {
  const targetIdx = schedule.findIndex(s => s.date === targetDateStr);
  if (targetIdx === -1) return schedule;

  const completedPart = schedule.slice(0, targetIdx);
  const futurePart = schedule.slice(targetIdx);
  const baseDate = parseLocalDate(targetDateStr);
  
  const updatedFuture = [];
  let currentOffset = 0;
  
  for (let i = 0; i < futurePart.length; i++) {
    const origItem = futurePart[i];
    const currentDate = addDays(baseDate, currentOffset);
    const dateString = getLocalDateString(currentDate);
    
    let isDrugDay = false;
    if (intervalWeeks === 4) {
      isDrugDay = (origItem.dayNumber === 11);
    } else {
      isDrugDay = (origItem.dayNumber === 11 || origItem.dayNumber === 25);
    }
    
    updatedFuture.push({
      ...origItem,
      date: dateString,
      isDrugDay,
      status: isDrugDay ? 'pending' : 'none'
    });
    
    currentOffset++;
  }
  
  return [...completedPart, ...updatedFuture];
};

/**
 * ルンスミオ効果評価リセット時の9C以降再構築（provisional）
 */
export const rebuildProvisionalCycles = (schedule, regimen) => {
  const completedPart = schedule.filter(s => s.cycleNumber <= 8);
  const day8Start = completedPart.find(s => s.cycleNumber === 8 && s.dayNumber === 1);
  
  if (!day8Start) return schedule; // 8C Day1が見つからなければそのまま返す

  const startDateObj = parseLocalDate(day8Start.date);
  const newFutureItems = [];
  const baseAbsoluteDay = day8Start.absoluteDayNumber || 168;
  
  for (let cycle = 9; cycle <= 17; cycle++) {
    for (let day = 1; day <= regimen.cycleDays; day++) {
      const offsetDays = (cycle - 8) * 21 + (day - 1);
      const sDate = addDays(startDateObj, offsetDays);
      
      const isDrugDay = regimen.drugs.filter(drug => {
        if (drug.applicableCycles && drug.applicableCycles.length > 0) {
          const targetCycle = cycle > 8 ? 8 : cycle;
          if (!drug.applicableCycles.includes(targetCycle)) return false;
        }
        return drug.applicableDays && drug.applicableDays.length > 0
          ? drug.applicableDays.includes(day)
          : regimen.drugDays.includes(day);
      }).length > 0;
      
      newFutureItems.push({
        cycleNumber: cycle,
        dayNumber: day,
        absoluteDayNumber: baseAbsoluteDay + offsetDays,
        date: getLocalDateString(sDate),
        isDrugDay,
        status: isDrugDay ? 'provisional' : 'none'
      });
    }
  }
  
  return [...completedPart, ...newFutureItems];
};
