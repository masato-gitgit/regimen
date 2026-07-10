const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
let content = fs.readFileSync(patientListPath, 'utf-8');

// The calendar wrapper is no longer needed since RegimenAssignPanel provides it.
// Actually wait, let's just replace from `})()` up to `) : (`
// Line 1307 is `                    })()}`
// Line 1308 is `                  </div>`  <-- this is the <div> that wrapped the entire active regimen block! But since we removed the opening `<div>` at line 655, this is now a syntax error.
// We should remove `                  </div>` as well.

const regex = /                    \}\)\(\)\}\r?\n                  <\/div>\r?\n                \) : \([\s\S]*?              <\/div>\r?\n            <\/div>\r?\n          <\/div>\) : \(/;

if (regex.test(content)) {
  content = content.replace(regex, `                    })()}
            </RegimenAssignPanel>
          </div>) : (`);
  fs.writeFileSync(patientListPath, content, 'utf-8');
  console.log('Regex replace successful');
} else {
  console.log('Regex did not match');
  // fallback to substring search to find where the mismatch is
  const idx = content.indexOf('})()}');
  if (idx !== -1) {
    console.log("Found })()} at ", idx);
    console.log(content.substring(idx, idx + 200));
  }
}
