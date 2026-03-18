const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'shant', 'Downloads', 'india_steel_methods_and_levers_fixed.xlsx');
console.log('Reading:', filePath);

const wb = XLSX.readFile(filePath);
console.log('Sheets:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'A1';
  const range = XLSX.utils.decode_range(ref);
  console.log('\n=== Sheet:', name, '===');
  console.log('Rows:', range.e.r + 1, 'Cols:', range.e.c + 1);

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Print all rows for smaller sheets, first 30 for larger ones
  const maxRows = Math.min(data.length, 50);
  for (let i = 0; i < maxRows; i++) {
    const row = data[i];
    // Truncate each cell for readability
    const cells = row.map(c => {
      const s = String(c);
      return s.length > 60 ? s.substring(0, 57) + '...' : s;
    });
    console.log('R' + i + ':', JSON.stringify(cells));
  }
  if (data.length > maxRows) {
    console.log('... (' + (data.length - maxRows) + ' more rows)');
  }
}
