/**
 * dateUtils.js
 * 日付処理に関する共通ユーティリティ
 */

/**
 * Dateオブジェクトからローカルタイムゾーンでの "YYYY-MM-DD" 文字列を取得する。
 * @param {Date} [d=new Date()] 
 * @returns {string} 例: "2023-04-01"
 */
export const getLocalDateString = (d = new Date()) => {
  if (!(d instanceof Date) || isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/**
 * "YYYY-MM-DD" 文字列から、ローカルタイムゾーンの0時0分0秒のDateオブジェクトを生成する。
 * （new Date('YYYY-MM-DD') を使用するとUTC扱いになるタイムゾーン脆弱性を回避するため）
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
};

/**
 * 指定したDateオブジェクトに日数を加算（減算）して新しいDateオブジェクトを返す。
 * （ミリ秒計算によるサマータイムや閏秒のズレを回避するため）
 * @param {Date|string} date Dateオブジェクト または "YYYY-MM-DD"文字列
 * @param {number} days 加算する日数（負の数も可）
 * @returns {Date}
 */
export const addDays = (date, days) => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  if (!d || isNaN(d)) return new Date();
  d.setDate(d.getDate() + days);
  return d;
};
