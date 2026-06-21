const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\User\\.local\\share\\opencode\\tool-output\\tool_ee8891983001EpuH1Na57n9ytB', 'utf8');
const lines = content.split('\n');

// Find table boundaries
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^\s*No\.\s*$/.test(lines[i].trim())) { startIdx = i; break; }
}
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('Qualified teams')) { endIdx = i; break; }
}

console.log(`Table starts at line ${startIdx}, ends at line ${endIdx}`);

const results = [];
let i = startIdx + 1;

while (i < endIdx) {
  const line = lines[i].trim();
  // Check if this is a row number 1-495
  if (/^\d+$/.test(line)) {
    const rowNum = parseInt(line);
    if (rowNum < 1 || rowNum > 495) { i++; continue; }
    i++;

    const qualGroups = [];
    const assignments = [];
    let inAssignments = false;

    while (i < endIdx) {
      const ln = lines[i].trim();
      i++;

      // If next row number, back up
      if (/^\d+$/.test(ln)) {
        const nextNum = parseInt(ln);
        if (nextNum === rowNum + 1) {
          i--;
          break;
        }
      }

      if (ln === '') continue;

      if (/^3[A-L]$/.test(ln)) {
        inAssignments = true;
        assignments.push(ln.substring(1));
      } else if (/^[A-L]$/.test(ln) && !inAssignments) {
        qualGroups.push(ln);
      }
    }

    const q = qualGroups.join(',');
    const a = (idx) => idx < assignments.length ? assignments[idx] : '?';
    results.push(`ROW ${rowNum}: QUALIFY=${q} | 1A=${a(0)} | 1B=${a(1)} | 1D=${a(2)} | 1E=${a(3)} | 1G=${a(4)} | 1I=${a(5)} | 1K=${a(6)} | 1L=${a(7)}`);
  } else {
    i++;
  }
}

fs.writeFileSync('C:\\Users\\User\\.local\\share\\opencode\\tool-output\\annex_c_parsed.txt', results.join('\n'), 'utf8');
console.log(`Parsed ${results.length} rows`);
console.log('First 10 rows:');
results.slice(0, 10).forEach(r => console.log(r));
console.log('...');
console.log('Last 10 rows:');
results.slice(-10).forEach(r => console.log(r));
