const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/GlobalCalendar.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace drug matching logic with getApplicableDrugs
const getEventsMatchRegex = /        const matchingDrugs = patientDrugs\.filter\([\s\S]*?        \}\);/g;
const replacementDrugs = `        const matchingDrugs = getApplicableDrugs(
          patientDrugs,
          cycle,
          day,
          reg.drugDays,
          { cycleCap: (patient.activeRegimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_SC || patient.activeRegimen.protocolType === PROTOCOL_TYPES.LUNSUMIO_IV) ? 8 : undefined }
        );`;
content = content.replace(getEventsMatchRegex, replacementDrugs);

// Remove generateCalendarCells, handlePrevMonth, handleNextMonth
const getCalendarCellsStart = content.indexOf('  // 月切り替え');
if (getCalendarCellsStart !== -1) {
  const getCalendarCellsEndStr = '  // 特定の日付の投与イベントを取得\n  const getEventsForDate = (dateStr) => {';
  const getCalendarCellsEndStrCRLF = '  // 特定の日付の投与イベントを取得\r\n  const getEventsForDate = (dateStr) => {';
  
  let endIdx = content.indexOf(getCalendarCellsEndStr, getCalendarCellsStart);
  if (endIdx === -1) endIdx = content.indexOf(getCalendarCellsEndStrCRLF, getCalendarCellsStart);
  
  if (endIdx !== -1) {
    content = content.substring(0, getCalendarCellsStart) + content.substring(endIdx);
  }
}

// Remove year, month variables
content = content.replace(/  const year = currentDate\.getFullYear\(\);\r?\n  const month = currentDate\.getMonth\(\);\r?\n\r?\n/, '');
content = content.replace(/  const daysOfWeek = \['日', '月', '火', '水', '木', '金', '土'\];\r?\n  const cells = generateCalendarCells\(\);\r?\n\r?\n/, '');


// Replace calendar UI block
const headerIdx = content.indexOf(`      {/* カレンダーコントロール */}`);
let endIdx = content.lastIndexOf(`    </div>`); // Before the `);`

if (headerIdx !== -1 && endIdx !== -1) {
  const replacement = `      <div className="card" style={{ flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
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
                      title={\`\${ev.patientName}: \${ev.regimenName} - \${ev.drugName} \${ev.dose} (C\${ev.cycle}D\${ev.day})\`}
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
`;
  content = content.substring(0, headerIdx) + replacement + content.substring(endIdx);
} else {
  console.log("Could not find calendar UI block in GlobalCalendar");
  process.exit(1);
}

// Add imports
content = content.replace(
  `import { getLocalDateString } from '../utils/dateUtils';`,
  `import { getLocalDateString } from '../utils/dateUtils';\nimport { getApplicableDrugs } from '../utils/drugMatching';\nimport MonthCalendar from './common/MonthCalendar';`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('GlobalCalendar.jsx updated successfully.');
