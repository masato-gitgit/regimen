const fs = require('fs');
const path = require('path');

const extractDir = path.join(__dirname, 'src/components/patient');
const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
const content = fs.readFileSync(patientListPath, 'utf-8');

// 1. We will extract all the calendar utility functions and the calendar JSX.
// First, find the utility functions in PatientList.jsx
// - getLastCompletedSideEffects
// - handleApplyProtocol
// - handleApplyLunsumioProtocol
// - handleApplyTalquetamabProtocol
// - handleUpdateTecveyriInterval
// - handleUpdateCombinationInterval
// - calculateBSA (also used by LabInputPanel? No, WeightRecalcPanel uses calculateBSA from doseUtils? No, WeightRecalcPanel takes it from renalUtils? Let's assume they can just be imported from doseUtils/renalUtils or left alone if we just copy them)

// Since we have limited regex power here in plain string manipulations without risking syntax errors, I'll provide a pre-written node script that will generate the new files using the latest context.

// Actually, writing a massive node script to perfectly slice PatientList.jsx is very complex because of matching braces.
// Let's use `multi_replace_file_content` or `write_to_file` to write the files directly, then slice `PatientList.jsx`.

// But wait, it's easier to just write a script that parses the `calendarJSX.txt` and wraps it in a component.

const calendarJSX = fs.readFileSync(path.join(__dirname, 'calendarJSX.txt'), 'utf-8');

// The calendar JSX is basically:
// {/* 治療スケジュールおよび... */}
// <div ...> ... </div>
// <div className="calendar-grid"> ... </div>
// {selectedEvent ? ( ... ) : null}

// Let's create `TreatmentCalendar.jsx`
const treatmentCalendarContent = `import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString, addDays } from '../../utils/dateUtils';
import { getJapaneseHoliday } from '../../utils/holidayUtils';
import { formatDose } from '../../utils/doseUtils';
import { useToast } from '../../hooks/useToast';
import ScheduleEventModal from './ScheduleEventModal';

export default function TreatmentCalendar({
  patient,
  regimens,
  onUpdatePatient,
  confirm
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { toast } = useToast();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const cells = [];
    
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(prevYear, prevMonth, prevDaysInMonth - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remainingCells = 42 - cells.length;
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false
      });
    }
    
    return cells;
  }, [currentMonth]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
        <h5 style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>投与スケジュールカレンダー：</h5>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={handlePrevMonth}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-primary)' }}>
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </span>
          <button type="button" className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={handleNextMonth}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-grid" style={{ marginBottom: '20px' }}>
        {['日', '月', '火', '水', '木', '金', '土'].map(day => (
          <div key={day} className="calendar-header-cell" style={{ padding: '6px 0', fontSize: '0.8rem' }}>{day}</div>
        ))}

        {calendarCells.map((cell, idx) => {
          const dateStr = getLocalDateString(cell.date);
          const dayEvents = (patient.schedule || []).filter(s => s.date === dateStr);
          const scheduleItem = dayEvents.find(s => s.isDrugDay) || dayEvents[0];
          const isToday = getLocalDateString(new Date()) === dateStr;
          const patientDrugs = patient.activeRegimen?.drugs || [];
          const targetDrugs = scheduleItem && scheduleItem.isDrugDay && patientDrugs.filter(d => d.applicableCycles && scheduleItem.cycleNumber && !d.applicableCycles.includes(scheduleItem.cycleNumber) ? false : d.applicableDays ? d.applicableDays.includes(scheduleItem.dayNumber) : true) || [];
          const holidayName = getJapaneseHoliday(cell.date);
          const isHoliday = holidayName !== null;
          const dayOfWeek = cell.date.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          
          return (
            <div 
              key={idx}
              className={\`calendar-cell \${cell.isCurrentMonth ? '' : 'other-month'}\`}
              style={{
                minHeight: '110px',
                padding: '6px',
                backgroundColor: isToday ? 'var(--color-primary-light)' : isHoliday || isSunday ? '#fff5f5' : isSaturday ? '#eff6ff' : cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                borderTop: isToday ? '3px solid var(--color-primary)' : 'none',
                borderBottom: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span 
                    className="calendar-date-number num-tabular"
                    style={{
                      color: isHoliday || isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : cell.isCurrentMonth ? 'var(--color-text-dark)' : 'var(--color-text-muted)',
                      fontWeight: cell.isCurrentMonth ? '600' : '400',
                      fontSize: '0.85rem'
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  {isHoliday && (
                    <span style={{ fontSize: '0.65rem', color: '#ef4444', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }} title={holidayName}>
                      {holidayName}
                    </span>
                  )}
                </div>
                {isToday && (
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#fff', backgroundColor: 'var(--color-primary)', padding: '2px 6px', borderRadius: '10px' }}>
                    今日
                  </span>
                )}
              </div>

              <div className="calendar-events" style={{ marginTop: '4px' }}>
                {scheduleItem && scheduleItem.isDrugDay && (
                  <div 
                    className="calendar-event"
                    style={{
                      backgroundColor: 
                        scheduleItem.status === 'completed' ? 'var(--color-success-light)' :
                        scheduleItem.status === 'skipped' ? 'var(--color-danger-light)' :
                        scheduleItem.status === 'running' ? 'var(--color-warning-light)' :
                        scheduleItem.status === 'provisional' ? '#f1f5f9' :
                        'var(--color-primary-light)',
                      color: 
                        scheduleItem.status === 'completed' ? 'var(--color-success)' :
                        scheduleItem.status === 'skipped' ? 'var(--color-danger)' :
                        scheduleItem.status === 'running' ? 'var(--color-warning)' :
                        scheduleItem.status === 'provisional' ? '#64748b' :
                        'var(--color-primary)',
                      border: scheduleItem.status === 'provisional' ? '1px dashed #94a3b8' : '1px solid currentColor',
                      cursor: 'pointer',
                      textDecoration: scheduleItem.status === 'skipped' ? 'line-through' : 'none',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '0.7rem'
                    }}
                    onClick={() => {
                      const patientDrugsAll = patient.activeRegimen?.drugs || [];
                      const drugOrigIndices = targetDrugs.map(d => patientDrugsAll.indexOf(d));
                      setSelectedEvent({ ...scheduleItem, drugs: targetDrugs, drugOrigIndices });
                    }}
                  >
                    <div style={{ fontWeight: '700' }}>
                      {scheduleItem.cycleNumber ? scheduleItem.cycleNumber + 'C ' : ''}
                      Day {scheduleItem.dayNumber}
                      {scheduleItem.status === 'provisional' && ' (見込み)'}
                      {scheduleItem.doseReduced && <span style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.6rem', border: '1px solid #ef4444', borderRadius: '2px', padding: '0 2px', backgroundColor: '#fff5f5' }}>減量</span>}
                    </div>
                    {targetDrugs.map((drug, dIdx) => {
                      let calculatedDose = 0;
                      if (drug.doseType === 'bsa') {
                        calculatedDose = drug.doseValue * patient.bsa;
                      } else if (drug.doseType === 'weight') {
                        calculatedDose = drug.doseValue * patient.weight;
                      } else {
                        calculatedDose = drug.doseValue;
                      }
                      if (scheduleItem.doseReduced) {
                        calculatedDose = calculatedDose * (scheduleItem.doseReductionRate || 0.8);
                      }
                      return (
                        <div key={dIdx} style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {drug.name.slice(0, 7)}:{formatDose(calculatedDose, drug.name)}mg
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <ScheduleEventModal
          event={selectedEvent}
          patient={patient}
          regimens={regimens}
          onUpdatePatient={onUpdatePatient}
          onClose={() => setSelectedEvent(null)}
          confirm={confirm}
        />
      )}
    </>
  );
}
`;

fs.writeFileSync(path.join(extractDir, 'TreatmentCalendar.jsx'), treatmentCalendarContent, 'utf-8');
console.log('Created TreatmentCalendar.jsx');

