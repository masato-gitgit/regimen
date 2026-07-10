import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, BookOpen } from 'lucide-react';
import { calcAndFormatDoseStr } from '../utils/doseUtils';
import { getLocalDateString } from '../utils/dateUtils';
import { getApplicableDrugs } from '../utils/drugMatching';
import MonthCalendar from './common/MonthCalendar';
import { PROTOCOL_TYPES } from '../utils/regimenProtocols';
import { getJapaneseHoliday } from '../utils/holidayUtils';


export default function GlobalCalendar({ patients, regimens, onSelectPatient, onNavigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

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

        const matchingDrugs = getApplicableDrugs(
          patientDrugs,
          cycle,
          day,
          reg.drugDays,
          { cycleCap: (patient.activeRegimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC || patient.activeRegimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV) ? 8 : undefined }
        );

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
    const reg = regimens.find(r => r.id === regimenId);
    if (!reg) return { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };

    switch (reg.protocolType) {
      case PROTOCOL_TYPES.TECVAYLI:
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case PROTOCOL_TYPES.LUNSUMIO_SC:
      case PROTOCOL_TYPES.LUNSUMIO_IV:
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
      case PROTOCOL_TYPES.TALQUETAMAB:
      case PROTOCOL_TYPES.COMBINATION:
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      default:
        // 標準的な抗がん剤（CHOP, R-CHOP等） - fallback logic 
        if (['R001', 'R002', 'R003'].includes(regimenId)) {
          return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
        }
        return { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
    }
  };

  const handleEventClick = (patientId) => {
    onSelectPatient(patientId);
    onNavigate('patients');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div className="card" style={{ flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <MonthCalendar
          currentMonth={currentDate}
          onMonthChange={setCurrentDate}
          showHolidays={true}
          showTodayButton={true}
          cellMinHeight="120px"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--color-primary)' }}>
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月 全体化学療法スケジュール
              </h3>
              <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                治療中患者数: {patients.filter(p => p.activeRegimen).length} 名
              </span>
            </div>
          }
          renderCellContent={({ dateStr }) => {
            const events = getEventsForDate(dateStr);
            if (events.length === 0) return null;
            return (
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
            );
          }}
        />
      </div>
    </div>
  );
}
