/**
 * calendarUtils.js
 * 月間カレンダーのセル配列生成ユーティリティ
 */

/**
 * 指定月のカレンダーセル（6週=42個）を生成する。
 * 前月・翌月の端数日を含む。
 * @param {number} year  - 西暦年
 * @param {number} month - 月 (0-11, Date と同じ)
 * @returns {{date: Date, isCurrentMonth: boolean}[]} 42要素
 */
export const getMonthCells = (year, month) => {
  const firstDayIndex = new Date(year, month, 1).getDay();
  const cells = [];

  // 前月の端数（Date コンストラクタは月・日のオーバーフローを自動補正する）
  for (let i = firstDayIndex; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
  }
  // 当月
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // 翌月の端数（42セルまで埋める）
  for (let d = 1; cells.length < 42; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }
  return cells;
};
