import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthCells } from '../../utils/calendarUtils';
import { getLocalDateString } from '../../utils/dateUtils';
import { getJapaneseHoliday } from '../../utils/holidayUtils';

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 月間カレンダーの共通枠。
 * セル配列生成・曜日ヘッダー・日付番号・祝日/土日/今日の装飾を提供し、
 * セルの中身は renderCellContent に委譲する。
 *
 * @param {Date}     currentMonth      表示中の月（任意の日でよい）
 * @param {Function} onMonthChange     (newDate: Date) => void
 * @param {Function} renderCellContent (cellInfo) => ReactNode
 *        cellInfo: { date, dateStr, isCurrentMonth, isToday, isHoliday,
 *                    holidayName, isSaturday, isSunday }
 * @param {boolean}  [showHolidays=true]  祝日表示・土日色分けの有無
 * @param {boolean}  [showTodayButton=true]
 * @param {string}   [cellMinHeight='110px']
 * @param {ReactNode}[title]           ナビ左側に出すタイトル
 */
export default function MonthCalendar({
  currentMonth,
  onMonthChange,
  renderCellContent,
  showHolidays = true,
  showTodayButton = true,
  cellMinHeight = '110px',
  title = null,
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
  const todayStr = getLocalDateString(new Date());

  const moveMonth = (offset) => onMonthChange(new Date(year, month + offset, 1));

  return (
    <div className="month-calendar">
      {/* ナビゲーション */}
      <div className="month-calendar-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }}
                  onClick={() => moveMonth(-1)} aria-label="前の月">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: '110px', textAlign: 'center' }}>
            {year}年 {month + 1}月
          </span>
          {showTodayButton && (
            <button type="button" className="btn btn-outline" style={{ padding: '4px 10px' }}
                    onClick={() => onMonthChange(new Date())}>
              今月
            </button>
          )}
          <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }}
                  onClick={() => moveMonth(1)} aria-label="次の月">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* グリッド */}
      <div className="calendar-grid">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div key={day} className="calendar-header-cell"
               style={{ padding: '6px 0', fontSize: '0.8rem',
                        color: idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : 'inherit' }}>
            {day}
          </div>
        ))}

        {cells.map((cell) => {
          const dateStr = getLocalDateString(cell.date);
          const holidayName = showHolidays ? getJapaneseHoliday(cell.date) : null;
          const dayOfWeek = cell.date.getDay();
          const cellInfo = {
            date: cell.date,
            dateStr,
            isCurrentMonth: cell.isCurrentMonth,
            isToday: dateStr === todayStr,
            isHoliday: !!holidayName,
            holidayName,
            isSunday: dayOfWeek === 0,
            isSaturday: dayOfWeek === 6,
          };

          const bg = cellInfo.isToday ? 'var(--color-primary-light)'
            : showHolidays && (cellInfo.isHoliday || cellInfo.isSunday) ? '#fff5f5'
            : showHolidays && cellInfo.isSaturday ? '#eff6ff'
            : cell.isCurrentMonth ? '#ffffff' : '#f8fafc';

          return (
            <div key={dateStr}
                 className={`calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'}`}
                 style={{
                   minHeight: cellMinHeight, padding: '6px', backgroundColor: bg,
                   borderTop: cellInfo.isToday ? '3px solid var(--color-primary)' : 'none',
                   borderBottom: '1px solid var(--color-border)',
                   borderRight: '1px solid var(--color-border)',
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="calendar-date-number num-tabular"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: cellInfo.isToday ? 700 : 500,
                        color: cellInfo.isHoliday || cellInfo.isSunday ? '#ef4444'
                             : cellInfo.isSaturday ? '#3b82f6'
                             : cell.isCurrentMonth ? 'var(--color-text-dark)' : 'var(--color-text-muted)',
                      }}>
                  {cell.date.getDate()}
                </span>
                {cellInfo.holidayName && (
                  <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}
                        title={cellInfo.holidayName}>
                    {cellInfo.holidayName}
                  </span>
                )}
              </div>
              <div className="calendar-events" style={{ marginTop: '4px' }}>
                {renderCellContent(cellInfo)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
