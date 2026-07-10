const fs = require('fs');
const path = require('path');

const patientListPath = path.join(__dirname, 'src/components/PatientList.jsx');
let content = fs.readFileSync(patientListPath, 'utf-8');

// We want to replace from:
//                         </div>
//                       );
//                     })()}
//             </RegimenAssignPanel>
//           </div>) : (
//           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
//
// Wait! In the current file, we already have `</RegimenAssignPanel>` at line 1308!
// Let's verify the current file content at line 1305-1310:
/*
1305:                         </div>
1306:                       );
1307:                     })()}
1308:             </RegimenAssignPanel>
1309:           </div>) : (
1310:           <div style={{ display: 'flex', ...
*/

// If the file looks EXACTLY like that, all we need to do is remove lines 1305-1307!

const targetStr = `                        </div>
                      );
                    })()}
            </RegimenAssignPanel>
          </div>) : (`;

const replacementStr = `            </RegimenAssignPanel>
          </div>) : (`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(patientListPath, content, 'utf-8');
  console.log("Successfully removed the orphaned IIFE closing tags!");
} else {
  // try with \r\n
  const targetStrCRLF = `                        </div>\r
                      );\r
                    })()}\r
            </RegimenAssignPanel>\r
          </div>) : (`;
  const replacementStrCRLF = `            </RegimenAssignPanel>\r
          </div>) : (`;
  
  if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, replacementStrCRLF);
    fs.writeFileSync(patientListPath, content, 'utf-8');
    console.log("Successfully removed the orphaned IIFE closing tags (CRLF)!");
  } else {
    // Regex fallback
    const regex = /                        <\/div>\r?\n                      \);\r?\n                    \}\)\(\)\}\r?\n            <\/RegimenAssignPanel>\r?\n          <\/div>\) : \(/;
    if (regex.test(content)) {
      content = content.replace(regex, `            </RegimenAssignPanel>\n          </div>) : (`);
      fs.writeFileSync(patientListPath, content, 'utf-8');
      console.log("Successfully removed with regex!");
    } else {
      console.log("Failed to find the string to replace!");
    }
  }
}
