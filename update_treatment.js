const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/patient/TreatmentCalendar.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace getApplicableDrugs
// In TreatmentCalendar.jsx: const targetDrugs = scheduleItem && scheduleItem.isDrugDay && patientDrugs.filter(d => d.applicableCycles && scheduleItem.cycleNumber && !d.applicableCycles.includes(scheduleItem.cycleNumber) ? false : d.applicableDays ? d.applicableDays.includes(scheduleItem.dayNumber) : true) || [];
// The user says for PatientList 1665行 (now TreatmentCalendar 100行), replace it with:
/*
        const targetDrugs = getApplicableDrugs(
          patient.activeRegimen?.drugs, item.cycleNumber, item.dayNumber,
          [] 
        );
*/

const getCalendarCellsStart = content.indexOf('  const calendarCells = useMemo(() => {');
if (getCalendarCellsStart !== -1) {
  const getCalendarCellsEndStr = '  }, [currentMonth]);';
  const getCalendarCellsEndStrCRLF = '  }, [currentMonth]);';
  let endIdx = content.indexOf(getCalendarCellsEndStr, getCalendarCellsStart);
  if (endIdx !== -1) {
    content = content.substring(0, getCalendarCellsStart) + content.substring(endIdx + getCalendarCellsEndStr.length + 1);
  }
}

// Remove ChevronLeft, ChevronRight, add getApplicableDrugs and MonthCalendar
content = content.replace(
  `import { ChevronLeft, ChevronRight } from 'lucide-react';`,
  `import { getApplicableDrugs } from '../../utils/drugMatching';\nimport MonthCalendar from '../common/MonthCalendar';`
);
content = content.replace(
  `import { getLocalDateString, addDays } from '../../utils/dateUtils';`,
  `import { getLocalDateString } from '../../utils/dateUtils';`
);
content = content.replace(
  `import { getJapaneseHoliday } from '../../utils/holidayUtils';\n`,
  ``
);

// Replace UI block
const headerIdx = content.indexOf(`    <>`);
const bodyEndStr = '      {selectedEvent && (';
let endIdx = content.indexOf(bodyEndStr, headerIdx);

if (headerIdx !== -1 && endIdx !== -1) {
  const replacement = `    <>
      <MonthCalendar
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        showHolidays={true}
        showTodayButton={true}
        cellMinHeight="110px"
        title={<h5 style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>投与スケジュールカレンダー：</h5>}
        renderCellContent={({ dateStr }) => {
          const dayEvents = (patient.schedule || []).filter(s => s.date === dateStr);
          const scheduleItem = dayEvents.find(s => s.isDrugDay) || dayEvents[0];
          
          if (!scheduleItem || !scheduleItem.isDrugDay) return null;
          
          const targetDrugs = getApplicableDrugs(
            patient.activeRegimen?.drugs,
            scheduleItem.cycleNumber,
            scheduleItem.dayNumber,
            []
          );

          return (
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
          );
        }}
      />
`;
  content = content.substring(0, headerIdx) + replacement + content.substring(endIdx);
}

// Remove handlePrevMonth, handleNextMonth
const handlePrevNextRegex = /  const handlePrevMonth[\s\S]*?handleNextMonth[\s\S]*?  \};\r?\n\r?\n/g;
content = content.replace(handlePrevNextRegex, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('TreatmentCalendar.jsx updated successfully.');
