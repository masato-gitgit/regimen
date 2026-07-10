/**
 * holidayUtils.js
 * 日本の祝日判定ユーティリティ
 */

// 春分の日
const getVernalEquinox = (year) => {
  if (year < 1900 || year > 2099) return 20;
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
};

// 秋分の日
const getAutumnalEquinox = (year) => {
  if (year < 1900 || year > 2099) return 23;
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
};

/**
 * 日本の祝日判定（簡易版）
 * @param {Date} date
 * @returns {string|null} 祝日の名前。祝日でない場合は null
 */
export const getJapaneseHoliday = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // 病院独自の休日
  if (m === 5 && d === 1) return '休日';
  if (m === 12 && d >= 29 && d <= 31) return '年末年始休暇';

  // 固定の祝日
  const checkHolidayOnly = (yy, mm, dd) => {
    const vn = getVernalEquinox(yy);
    const an = getAutumnalEquinox(yy);
    const getMonday = (year, month, weekNumber) => {
      const firstDay = new Date(year, month - 1, 1).getDay();
      let firstMonday = 1;
      if (firstDay !== 1) {
        firstMonday = firstDay === 0 ? 2 : 9 - firstDay;
      }
      return firstMonday + (weekNumber - 1) * 7;
    };

    if (mm === 1 && dd === 1) return true;
    if (mm === 2 && dd === 11) return true;
    if (mm === 2 && dd === 23) return true;
    if (mm === 4 && dd === 29) return true;
    if (mm === 5 && dd === 3) return true;
    if (mm === 5 && dd === 4) return true;
    if (mm === 5 && dd === 5) return true;
    if (mm === 8 && dd === 11) return true;
    if (mm === 11 && dd === 3) return true;
    if (mm === 11 && dd === 23) return true;

    if (mm === 1 && dd === getMonday(yy, 1, 2)) return true;
    if (mm === 7 && dd === getMonday(yy, 7, 3)) return true;
    if (mm === 9 && dd === getMonday(yy, 9, 3)) return true;
    if (mm === 10 && dd === getMonday(yy, 10, 2)) return true;

    if (mm === 3 && dd === vn) return true;
    if (mm === 9 && dd === an) return true;

    return false;
  };

  const getHolidayName = (yy, mm, dd) => {
    if (mm === 1 && dd === 1) return '元日';
    if (mm === 2 && dd === 11) return '建国記念の日';
    if (mm === 2 && dd === 23) return '天皇誕生日';
    if (mm === 4 && dd === 29) return '昭和の日';
    if (mm === 5 && dd === 3) return '憲法記念日';
    if (mm === 5 && dd === 4) return 'みどりの日';
    if (mm === 5 && dd === 5) return 'こどもの日';
    if (mm === 8 && dd === 11) return '山の日';
    if (mm === 11 && dd === 3) return '文化の日';
    if (mm === 11 && dd === 23) return '勤労感謝の日';

    const getMonday = (year, month, weekNumber) => {
      const firstDay = new Date(year, month - 1, 1).getDay();
      let firstMonday = 1;
      if (firstDay !== 1) {
        firstMonday = firstDay === 0 ? 2 : 9 - firstDay;
      }
      return firstMonday + (weekNumber - 1) * 7;
    };

    if (mm === 1 && dd === getMonday(yy, 1, 2)) return '成人の日';
    if (mm === 7 && dd === getMonday(yy, 7, 3)) return '海の日';
    if (mm === 9 && dd === getMonday(yy, 9, 3)) return '敬老の日';
    if (mm === 10 && dd === getMonday(yy, 10, 2)) return 'スポーツの日';

    if (mm === 3 && dd === getVernalEquinox(yy)) return '春分の日';
    if (mm === 9 && dd === getAutumnalEquinox(yy)) return '秋分の日';

    return null;
  };

  const directHoliday = getHolidayName(y, m, d);
  if (directHoliday) return directHoliday;

  // 振替休日（祝日が日曜日の場合、その後の最初の平日が休日）
  if (date.getDay() !== 0) { // 日曜以外
    for (let offset = 1; offset <= 3; offset++) {
      const prevDate = new Date(y, m - 1, d - offset);
      if (prevDate.getDay() === 0) {
        if (checkHolidayOnly(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate())) return '振替休日';
        break; // 日曜まで遡って祝日じゃなければ終了
      } else if (!checkHolidayOnly(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate())) {
        break; // 連続する祝日が途切れたら終了
      }
    }
  }

  // 国民の休日（前後が祝日である平日）
  if (date.getDay() !== 0 && date.getDay() !== 6) { // 日曜以外、土曜以外
    const prevDate = new Date(y, m - 1, d - 1);
    const nextDate = new Date(y, m - 1, d + 1);
    if (checkHolidayOnly(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate()) && 
        checkHolidayOnly(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())) {
      return '国民の休日';
    }
  }

  return null;
};
