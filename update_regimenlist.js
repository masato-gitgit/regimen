const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/RegimenList.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace getDayInfo internal filtering with getApplicableDrugs
const getDayInfoFilterRegex = /    const targetDrugs = regimen\.drugs\.filter\(drug => \{[\s\S]*?      return regimen\.drugDays\.includes\(dayNumber\);\r?\n    \}\);/g;
content = content.replace(getDayInfoFilterRegex, `    const targetDrugs = getApplicableDrugs(regimen.drugs, cycleNumber, dayNumber, regimen.drugDays);`);

// Remove getCalendarCells, calendarCells, handlePrevMonth, handleNextMonth
const getCalendarCellsStart = content.indexOf('  const getCalendarCells = () => {');
if (getCalendarCellsStart !== -1) {
  const getCalendarCellsEndRegex = /  const handleNextMonth = \(\) => \{\r?\n    setCalendarDate\(new Date\(calendarDate\.getFullYear\(\), calendarDate\.getMonth\(\) \+ 1, 1\)\);\r?\n  \};\r?\n/g;
  const match = getCalendarCellsEndRegex.exec(content);
  if (match) {
    content = content.substring(0, getCalendarCellsStart) + content.substring(match.index + match[0].length);
  }
}

// Replace the calendar UI
const headerIdx = content.indexOf(`              <div className="card" style={{ marginTop: '24px' }}>`);
const bodyEndStr = '          })()}';
let endIdx = content.indexOf(bodyEndStr, headerIdx);

if (headerIdx !== -1 && endIdx !== -1) {
  const replacement = `              <div className="card regimen-simulation-card" style={{ marginTop: '30px', borderTop: '2px solid var(--color-primary)', backgroundColor: '#f8fafc' }}>
                <div className="card-body" style={{ padding: '15px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                    このレジメンを{getLocalDateString(calendarStartMonday)}（第1週月曜日）から開始したと仮定した日程シミュレーションです。
                  </p>
                  <MonthCalendar
                    currentMonth={calendarDate}
                    onMonthChange={setCalendarDate}
                    showHolidays={false}
                    showTodayButton={false}
                    cellMinHeight="90px"
                    title={<h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: 0, color: 'var(--color-primary)' }}>日程シミュレーション</h4>}
                    renderCellContent={({ date }) => {
                      const dayInfo = getDayInfo(date, regimen);
                      if (!dayInfo?.isDrugDay) return null;
                      return (
                        <div 
                          className="calendar-event"
                          style={{
                            backgroundColor: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                            border: '1px solid currentColor',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontSize: '0.65rem'
                          }}
                        >
                          <div style={{ fontWeight: '700' }}>C{dayInfo.cycleNumber} - Day {dayInfo.dayNumber}</div>
                          {dayInfo.drugs.map((drug, i) => {
                            const unit = drug.doseType === 'bsa' ? 'mg/m²' : drug.doseType === 'weight' ? 'mg/kg' : 'mg';
                            return (
                              <div key={i} style={{ fontSize: '0.55rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                {drug.name.slice(0, 7)}: {drug.doseValue}{unit}
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
`;
  content = content.substring(0, headerIdx) + replacement + content.substring(endIdx);
} else {
  console.log("Could not find calendar UI block");
  process.exit(1);
}

// Add imports
content = content.replace(
  `import { getLocalDateString } from '../utils/dateUtils';`,
  `import { getLocalDateString } from '../utils/dateUtils';\nimport { getApplicableDrugs } from '../utils/drugMatching';\nimport MonthCalendar from './common/MonthCalendar';`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('RegimenList.jsx updated successfully.');
