const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'tyson', 'Downloads', '2026 King City Disposal Invoices.xlsx');
const wb = XLSX.readFile(filePath, { cellDates: true });

// Test with sheet 4619
const sheetName = '4619';
const sheet = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('Sheet:', sheetName);
console.log('Total rows:', data.length);

// Build allText like the parser does
const allText = [];
for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
  const row = data[rowIdx];
  for (let colIdx = 0; colIdx < row.length; colIdx++) {
    const cellStr = String(row[colIdx] || '').trim();
    if (cellStr) {
      allText.push({ row: rowIdx, col: colIdx, value: cellStr, lower: cellStr.toLowerCase() });
    }
  }
}

console.log('\n--- Looking for Invoice No ---');
for (const cell of allText) {
  if (cell.lower.includes('invoice no') || cell.lower.includes('invoice #')) {
    console.log('Found at row', cell.row, 'col', cell.col, ':', cell.value);
    console.log('Next cell (col+1):', data[cell.row]?.[cell.col + 1]);
  }
}

console.log('\n--- Looking for TOTAL ---');
for (let rowIdx = data.length - 1; rowIdx >= 0; rowIdx--) {
  const row = data[rowIdx];
  for (let colIdx = 0; colIdx < row.length; colIdx++) {
    const cell = String(row[colIdx] || '').toLowerCase().trim();
    if (cell === 'total' || cell.startsWith('total ') || cell.startsWith('total:')) {
      console.log('Found TOTAL at row', rowIdx, 'col', colIdx);
      console.log('Full row:', JSON.stringify(row));
      // Look in subsequent columns
      for (let i = colIdx + 1; i < row.length; i++) {
        const val = row[i];
        if (val !== '' && val !== null && val !== undefined) {
          console.log('  Col', i, ':', val, typeof val);
        }
      }
    }
  }
}

console.log('\n--- Looking for Line Total header ---');
for (const cell of allText) {
  if (cell.lower === 'line total' || cell.lower.includes('line total')) {
    console.log('Found at row', cell.row, 'col', cell.col);
  }
}

// Test parseCurrency
function parseCurrency(value) {
  if (!value) return 0;
  if (typeof value === 'number') {
    if (value >= 1000000000 && value <= 9999999999 && Number.isInteger(value)) {
      return 0;
    }
    return Math.round(value * 100);
  }
  const str = String(value).replace(/[$,\s]/g, '');
  if (/^\d{10}$/.test(str)) {
    return 0;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

console.log('\n--- Testing parseCurrency ---');
console.log('550 =>', parseCurrency(550));
console.log('"$550.00" =>', parseCurrency('$550.00'));
console.log('6182318380 =>', parseCurrency(6182318380));
