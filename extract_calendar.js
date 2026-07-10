const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
const content = fs.readFileSync(patientListPath, 'utf-8');

const calendarStart = content.indexOf(`{/* 治療スケジュールおよび投与薬剤一覧（月間カレンダー方式） */}`);
const calendarEnd = content.indexOf(`</RegimenAssignPanel>`);

if (calendarStart === -1 || calendarEnd === -1) {
  console.log("Could not find calendar block bounds");
  process.exit(1);
}

const calendarJSX = content.substring(calendarStart, calendarEnd);

fs.writeFileSync('calendarJSX.txt', calendarJSX, 'utf-8');
console.log("Exported calendar JSX to calendarJSX.txt");
