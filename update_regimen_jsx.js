const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
let content = fs.readFileSync(patientListPath, 'utf-8');

// Replacement 1:
const part1StartStr = '{/* 化学療法レジメン設定 */}';
const part1EndStr = '{/* 治療スケジュールおよび投与薬剤一覧（月間カレンダー方式） */}';
const p1Start = content.indexOf(part1StartStr);
const p1End = content.indexOf(part1EndStr, p1Start);

if (p1Start !== -1 && p1End !== -1) {
  const before1 = content.substring(0, p1Start);
  const after1 = content.substring(p1End);
  const repl1 = `<RegimenAssignPanel 
              key={selectedPatient.id}
              patient={selectedPatient}
              regimens={regimens}
              onUpdatePatient={onUpdatePatient}
              confirm={confirm}
            >\n              `;
  content = before1 + repl1 + after1;
} else {
  console.log("Failed to find part 1");
}

// Replacement 2:
// We need to replace from exactly:
/*
                      );
                    })()}
                  </div>
                ) : (
                  // レジメンの新規割り当て・変更フォーム
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '15px' }}>
*/

const p2StartStr = `                      );
                    })()}
                  </div>
                ) : (`;

const p2Start = content.indexOf(p2StartStr);

if (p2Start !== -1) {
  const before2 = content.substring(0, p2Start + 29); // Keep up to `})()`
  // Now find the end of the form, which is `                )}\n              </div>\n            </div>`
  
  const endStr = `                  </div>
                )}
              </div>
            </div>`;
  const p2End = content.indexOf(endStr, p2Start);
  if (p2End !== -1) {
    const after2 = content.substring(p2End + endStr.length);
    const repl2 = `\n                  </div>\n            </RegimenAssignPanel>`;
    content = before2 + repl2 + after2;
  } else {
    console.log("Failed to find part 2 end");
  }
} else {
  console.log("Failed to find part 2 start");
}

fs.writeFileSync(patientListPath, content, 'utf-8');
console.log('JSX update complete');
