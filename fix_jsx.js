const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
let content = fs.readFileSync(patientListPath, 'utf-8');

// Find the start of the else branch
const elseStartStr = `                  </div>
                ) : (
                  /* レジメンの新規割り当て・変更フォーム */`;

const elseStartIdx = content.indexOf(elseStartStr);
if (elseStartIdx === -1) {
  console.log("Failed to find elseStartStr");
} else {
  // Find the end of the card
  const cardEndStr = `                )}
              </div>
            </div>`;
  const cardEndIdx = content.indexOf(cardEndStr, elseStartIdx) + cardEndStr.length;
  
  if (cardEndIdx !== -1) {
    const before = content.substring(0, elseStartIdx);
    const after = content.substring(cardEndIdx);
    
    // The calendar children needs to be closed properly, so we keep `</div>\n` and add `</RegimenAssignPanel>`
    const replacement = `                  </div>\n            </RegimenAssignPanel>`;
    content = before + replacement + after;
    fs.writeFileSync(patientListPath, content, 'utf-8');
    console.log("Replaced successfully!");
  } else {
    console.log("Failed to find cardEndStr");
  }
}
