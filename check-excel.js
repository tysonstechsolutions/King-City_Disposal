const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'tyson', 'Downloads', '2026 King City Disposal Invoices.xlsx');
const wb = XLSX.readFile(filePath, { type: 'file', cellDates: true });

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

// Test parsing sheet 4619
const sheetName = '4619';
const sheet = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== Testing sheet', sheetName, '===');
console.log('Total rows:', data.length);

// Exactly replicate the parser's TOTAL search
let total_cents = 0;
for (let rowIdx = data.length - 1; rowIdx >= 0; rowIdx--) {
  const row = data[rowIdx];
  for (let colIdx = 0; colIdx < row.length; colIdx++) {
    const cell = String(row[colIdx] || '').toLowerCase().trim();

    if ((cell === 'total' || cell.startsWith('total ') || cell.startsWith('total:')) && !total_cents) {
      console.log(`Found TOTAL at row ${rowIdx}, col ${colIdx}`);
      const cellFull = String(row[colIdx] || '');
      const inCellAmount = parseCurrency(cellFull);
      if (inCellAmount > 0) {
        total_cents = inCellAmount;
        console.log(`Total from same cell: ${inCellAmount}`);
      } else {
        for (let i = colIdx + 1; i < row.length; i++) {
          const val = row[i];
          if (val !== '' && val !== null && val !== undefined) {
            const amount = parseCurrency(val);
            console.log(`Checking col ${i}: ${JSON.stringify(val)} (${typeof val}) => ${amount}`);
            if (amount > 0) {
              total_cents = amount;
              break;
            }
          }
        }
      }
    }
  }
}

console.log('\nFinal total_cents:', total_cents);
console.log('Expected: 55000 (for $550.00)');
