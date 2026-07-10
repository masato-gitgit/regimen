const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
let content = fs.readFileSync(patientListPath, 'utf-8');

// The block to replace in PatientList is from:
// {/* 治療スケジュールおよび投与薬剤一覧（月間カレンダー方式） */}
// to the end of the RegimenAssignPanel children.

const calendarStartStr = `{/* 治療スケジュールおよび投与薬剤一覧（月間カレンダー方式） */}`;
const calendarEndStr = `</RegimenAssignPanel>`;

const calendarStart = content.indexOf(calendarStartStr);
const calendarEnd = content.indexOf(calendarEndStr);

if (calendarStart !== -1 && calendarEnd !== -1) {
  const before = content.substring(0, calendarStart);
  const after = content.substring(calendarEnd);
  
  const replacement = `<TreatmentCalendar 
                patient={selectedPatient}
                regimens={regimens}
                onUpdatePatient={onUpdatePatient}
                confirm={confirm}
              />
            `;
  content = before + replacement + after;
}

// Now we need to remove the states and functions that are no longer used in PatientList.jsx
// 1. currentMonth, selectedEvent, preOmittedDrugIndices, delayDays, manualDate, slideRest, crsGrade, hematologicGrade, otherGrade, completionNotes
const statesToRemove = [
  /  const \[currentMonth, setCurrentMonth\] = useState\(new Date\(\)\);\r?\n/g,
  /  const \[selectedEvent, setSelectedEvent\] = useState\(null\);\r?\n/g,
  /  const \[preOmittedDrugIndices, setPreOmittedDrugIndices\] = useState\(\[\]\);\r?\n/g,
  /  const \[delayDays, setDelayDays\] = useState\(7\);\r?\n/g,
  /  const \[manualDate, setManualDate\] = useState\(''\);\r?\n/g,
  /  const \[slideRest, setSlideRest\] = useState\(true\);\r?\n/g,
  /  const \[crsGrade, setCrsGrade\] = useState\('none'\);\r?\n/g,
  /  const \[hematologicGrade, setHematologicGrade\] = useState\('none'\);\r?\n/g,
  /  const \[otherGrade, setOtherGrade\] = useState\('none'\);\r?\n/g,
  /  const \[completionNotes, setCompletionNotes\] = useState\(''\);\r?\n/g,
];

for (const regex of statesToRemove) {
  content = content.replace(regex, '');
}

// Remove the utility functions (getLastCompletedSideEffects to getCalendarCells)
// We'll just regex replace from getLastCompletedSideEffects to the end of getCalendarCells
// Actually, it's safer to just search for the strings.
const funcStart = content.indexOf('  // 直近の投与完了時の副作用情報を取得する');
const funcEndStr = `return cells;\n  }, [currentMonth]);`;
// wait, calendarCells was changed to `useMemo` in TreatmentCalendar, but in PatientList it was `const getCalendarCells = () => {` ?
const funcEndIdxAlt = content.indexOf(`  const getCalendarCells = () => {`);

// Let's just use string slicing
if (funcStart !== -1) {
  // Let's find the end of getCalendarCells
  const endMarker = `    return cells;\n  };`;
  const endIdx = content.indexOf(endMarker, funcStart);
  if (endIdx !== -1) {
    const end = endIdx + endMarker.length;
    content = content.substring(0, funcStart) + content.substring(end);
  } else {
    // maybe CRLF
    const endMarkerCRLF = `    return cells;\r\n  };`;
    const endIdxCRLF = content.indexOf(endMarkerCRLF, funcStart);
    if (endIdxCRLF !== -1) {
      const end = endIdxCRLF + endMarkerCRLF.length;
      content = content.substring(0, funcStart) + content.substring(end);
    }
  }
}

// Add import for TreatmentCalendar at the top
content = content.replace(
  `import RegimenAssignPanel from './patient/RegimenAssignPanel';`,
  `import RegimenAssignPanel from './patient/RegimenAssignPanel';\nimport TreatmentCalendar from './patient/TreatmentCalendar';`
);

fs.writeFileSync(patientListPath, content, 'utf-8');
console.log("Updated PatientList.jsx");
