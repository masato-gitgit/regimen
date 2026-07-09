import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, BookOpen } from 'lucide-react';
import { calcAndFormatDoseStr } from '../utils/doseUtils';

const getLocalDateString = (d) => {
  if (!(d instanceof Date)) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getJapaneseHoliday = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = date.getDay();

  const getDayNumberOfMonth = (dt) => {
    return Math.floor((dt.getDate() - 1) / 7) + 1;
  };

  const getVernalEquinox = (year) => {
    if (year < 1900 || year > 2099) return 20;
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  };

  const getAutumnalEquinox = (year) => {
    if (year < 1900 || year > 2099) return 23;
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  };

  const vernal = getVernalEquinox(y);
  const autumnal = getAutumnalEquinox(y);

  let holidayName = '';

  if (m === 5 && d === 1) holidayName = '休日';
  else if (m === 12 && d === 29) holidayName = '年末年始休暇';
  else if (m === 12 && d === 30) holidayName = '年末年始休暇';
  else if (m === 12 && d === 31) holidayName = '年末年始休暇';
  else if (m === 1 && d === 1) holidayName = '元日';
  else if (m === 1 && w === 1 && getDayNumberOfMonth(date) === 2) holidayName = '成人の日';
  else if (m === 2 && d === 11) holidayName = '建国記念の日';
  else if (m === 2 && d === 23) holidayName = '天皇誕生日';
  else if (m === 3 && d === vernal) holidayName = '春分の日';
  else if (m === 4 && d === 29) holidayName = '昭和の日';
  else if (m === 5 && d === 3) holidayName = '憲法記念日';
  else if (m === 5 && d === 4) holidayName = 'みどりの日';
  else if (m === 5 && d === 5) holidayName = 'こどもの日';
  else if (m === 7 && w === 1 && getDayNumberOfMonth(date) === 3) holidayName = '海の日';
  else if (m === 8 && d === 11) holidayName = '山の日';
  else if (m === 9 && w === 1 && getDayNumberOfMonth(date) === 3) holidayName = '敬老の日';
  else if (m === 9 && d === autumnal) holidayName = '秋分の日';
  else if (m === 10 && w === 1 && getDayNumberOfMonth(date) === 2) holidayName = 'スポーツの日';
  else if (m === 11 && d === 3) holidayName = '文化の日';
  else if (m === 11 && d === 23) holidayName = '勤労感謝の日';

  if (holidayName) return holidayName;

  const checkHolidayOnly = (y, m, d, w) => {
    const tempDate = new Date(y, m - 1, d);
    const tempW = tempDate.getDay();
    const tempN = Math.floor((d - 1) / 7) + 1;
    const tempVern = getVernalEquinox(y);
    const tempAut = getAutumnalEquinox(y);

    if (m === 1 && d === 1) return true;
    if (m === 1 && tempW === 1 && tempN === 2) return true;
    if (m === 2 && d === 11) return true;
    if (m === 2 && d === 23) return true;
    if (m === 3 && d === tempVern) return true;
    if (m === 4 && d === 29) return true;
    if (m === 5 && d === 3) return true;
    if (m === 5 && d === 4) return true;
    if (m === 5 && d === 5) return true;
    if (m === 7 && tempW === 1 && tempN === 3) return true;
    if (m === 8 && d === 11) return true;
    if (m === 9 && tempW === 1 && tempN === 3) return true;
    if (m === 9 && d === tempAut) return true;
    if (m === 10 && tempW === 1 && tempN === 2) return true;
    if (m === 11 && d === 3) return true;
    if (m === 11 && d === 23) return true;
    return false;
  };

  if (w !== 0) {
    let temp = new Date(date);
    let shift = 1;
    while (shift < 7) {
      temp.setDate(temp.getDate() - 1);
      const ty = temp.getFullYear();
      const tm = temp.getMonth() + 1;
      const td = temp.getDate();
      const tw = temp.getDay();
      
      const isTempHoliday = checkHolidayOnly(ty, tm, td, tw);
      if (isTempHoliday) {
        if (tw === 0) {
          return '振替休日';
        }
      } else {
        break;
      }
      shift++;
    }
  }

  if (w !== 0 && w !== 6) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    const prevHoliday = checkHolidayOnly(prev.getFullYear(), prev.getMonth() + 1, prev.getDate(), prev.getDay());
    const nextHoliday = checkHolidayOnly(next.getFullYear(), next.getMonth() + 1, next.getDate(), next.getDay());

    if (prevHoliday && nextHoliday) {
      return '国民の休日';
    }
  }

  return null;
};

export default function GlobalCalendar({ patients, regimens, onSelectPatient, onNavigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月切り替え
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // カレンダーの日付セル生成
  const generateCalendarCells = () => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const cells = [];

    // 前月の端数
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevLastDate - i),
        isCurrentMonth: false
      });
    }

    // 当月の日付
    for (let d = 1; d <= lastDate; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true
      });
    }

    // 翌月の端数
    const totalCells = 42; // 6行分
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false
      });
    }

    return cells;
  };

  // 特定の日付の投与イベントを取得
  const getEventsForDate = (dateStr) => {
    const events = [];
    patients.forEach(patient => {
      if (!patient.activeRegimen || !patient.schedule) return;
      const daySchedules = patient.schedule.filter(s => s.date === dateStr);
      const daySchedule = daySchedules.find(s => s.isDrugDay) || daySchedules[0];
      if (daySchedule && daySchedule.isDrugDay && daySchedule.status !== 'skipped') {
        const reg = regimens.find(r => r.id === patient.activeRegimen.regimenId) || {
          name: patient.activeRegimen.regimenName || '不明なレジメン',
          drugDays: []
        };

        const cycle = daySchedule.cycleNumber;
        const day = daySchedule.dayNumber;
        const patientDrugs = patient.activeRegimen.drugs || [];

        const matchingDrugs = patientDrugs.filter(drug => {
          if (drug.applicableCycles && drug.applicableCycles.length > 0) {
            if (!drug.applicableCycles.includes(cycle)) return false;
          }
          if (drug.applicableDays && drug.applicableDays.length > 0) {
            return drug.applicableDays.includes(day);
          }
          if (reg.drugDays && reg.drugDays.length > 0) {
            return reg.drugDays.includes(day);
          }
          return true;
        });

        if (matchingDrugs.length === 0) return;

        matchingDrugs.forEach(drug => {
          // 投与量計算（共通ユーティリティで統一）
          const dose = calcAndFormatDoseStr(drug, patient);

          events.push({
            patientId: patient.id,
            patientName: patient.name,
            regimenId: reg.id,
            regimenName: reg.name,
            drugName: drug.name,
            dose,
            status: daySchedule.status,
            cycle,
            day
          });
        });
      }
    });
    return events;
  };

  // レジメンごとの配色バッジCSS
  const getRegimenBadgeStyle = (regimenId) => {
    // R011, R6953: テクベイリ
    if (regimenId === 'R011' || regimenId === 'R6953') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
    // R004, R005, R012, R013, R6365, R9045: ルンスミオ
    if (['R004', 'R005', 'R012', 'R013', 'R6365', 'R9045'].includes(regimenId)) {
      return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
    }
    // R010, R016, R8321: トアルクエタマブ・テクラスタマブ併用
    if (regimenId === 'R010' || regimenId === 'R016' || regimenId === 'R8321') {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    }
    // 標準的な抗がん剤（CHOP, R-CHOP等）
    if (['R001', 'R002', 'R003'].includes(regimenId)) {
      return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
    }
    // その他
    return { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
  };

  const handleEventClick = (patientId) => {
    onSelectPatient(patientId);
    onNavigate('patients');
  };

  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  const cells = generateCalendarCells();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* カレンダーコントロール */}
      <div className="card" style={{ padding: '15px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--color-primary)' }}>
              {year}年 {month + 1}月 全体化学療法スケジュール
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
              治療中患者数: {patients.filter(p => p.activeRegimen).length} 名
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={handlePrevMonth} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChevronLeft size={16} />
              先月
            </button>
            <button className="btn btn-outline" onClick={() => setCurrentDate(new Date())} style={{ padding: '8px 12px' }}>
              今月
            </button>
            <button className="btn btn-outline" onClick={handleNextMonth} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              来月
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* カレンダー本体グリッド */}
      <div className="card" style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
        {/* 曜日ヘッダー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', borderBottom: '2px solid var(--color-border)', paddingBottom: '10px', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-dark)' }}>
          {daysOfWeek.map((day, idx) => (
            <div key={day} style={{ color: idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : 'inherit' }}>
              {day}曜日
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: '8px', marginTop: '10px' }}>
          {cells.map((cell, idx) => {
            const dateStr = getLocalDateString(cell.date);
            const events = getEventsForDate(dateStr);
            const isToday = getLocalDateString(new Date()) === dateStr;
            const holidayName = getJapaneseHoliday(cell.date);
            const isHoliday = !!holidayName;
            const dayOfWeek = cell.date.getDay();
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;

            return (
              <div
                key={idx}
                style={{
                  border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '8px',
                  backgroundColor: (isHoliday || isSunday)
                    ? '#fff5f5' // 日曜・祝日は薄い赤
                    : isSaturday
                      ? '#eff6ff' // 土曜は薄い青
                      : cell.isCurrentMonth 
                        ? '#fff' 
                        : 'var(--color-bg)',
                  opacity: cell.isCurrentMonth ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  minHeight: '120px',
                  boxShadow: isToday ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        color: isToday 
                          ? '#fff' 
                          : (isHoliday || isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : 'var(--color-text-dark)'),
                        backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                        borderRadius: isToday ? '50%' : 'none',
                        width: isToday ? '24px' : 'auto',
                        height: isToday ? '24px' : 'auto',
                        display: isToday ? 'flex' : 'inline',
                        alignItems: isToday ? 'center' : 'initial',
                        justifyContent: isToday ? 'center' : 'initial',
                      }}
                    >
                      {cell.date.getDate()}
                    </span>
                    {isHoliday && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }} title={holidayName}>
                        {holidayName}
                      </span>
                    )}
                  </div>
                  {events.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {events.length}件の投与
                    </span>
                  )}
                </div>

                {/* 投与予定リスト (高さを自動で伸ばして全員表示する) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                  {events.map((ev, eIdx) => {
                    const isProvisional = ev.status === 'provisional';
                    const baseBadgeStyle = getRegimenBadgeStyle(ev.regimenId);
                    const badgeStyle = isProvisional ? {
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      border: '1px dashed #94a3b8'
                    } : baseBadgeStyle;

                    return (
                      <div
                        key={eIdx}
                        onClick={() => handleEventClick(ev.patientId)}
                        style={{
                          ...badgeStyle,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                        className="calendar-event-badge"
                        title={`${ev.patientName}: ${ev.regimenName} - ${ev.drugName} ${ev.dose} (C${ev.cycle}D${ev.day})`}
                      >
                        <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={10} />
                          {ev.patientName}{isProvisional && ' (見込み)'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.9 }}>
                          <span>{ev.drugName}</span>
                          <span style={{ fontWeight: '600' }}>{ev.dose}</span>
                        </div>
                        {ev.status === 'completed' && (
                          <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700', textAlign: 'right' }}>
                            実施済
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
