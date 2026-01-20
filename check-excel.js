const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'tyson', 'Downloads', '2026 King City Disposal Invoices.xlsx');
const wb = XLSX.readFile(filePath, { type: 'file', cellDates: true });

// Test customer name extraction for a few sheets
const testSheets = ['4619', '4596', '4608', '4607', '4620'];

for (const sheetName of testSheets) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet ${sheetName} not found`);
    continue;
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log(`\n=== Testing sheet ${sheetName} ===`);

  // Build index of all cells
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

  let customer_name = '';
  let customer_id_code = '';

  // Extract Customer ID
  for (const cell of allText) {
    if (!customer_id_code) {
      if (cell.lower.includes('customer id') || cell.lower.includes('customer #') || cell.lower.includes('cust id')) {
        const match = cell.value.match(/[:.]\s*(.+)$/);
        if (match) {
          customer_id_code = match[1].trim();
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) customer_id_code = String(nextCell).trim();
        }
      }
    }
  }

  // Extract customer name - new logic
  for (const cell of allText) {
    if (cell.row < 15) {
      // Check for "Bill To" section
      if (cell.lower === 'bill to' || cell.lower.includes('bill to:')) {
        const belowCell = data[cell.row + 1]?.[cell.col];
        if (belowCell && String(belowCell).trim().length > 2) {
          const candidateName = String(belowCell).trim();
          if (!candidateName.toLowerCase().includes('king city') &&
              !candidateName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase|family|address)/)) {
            if (!customer_name) {
              customer_name = candidateName;
              console.log(`Found customer name from Bill To: ${candidateName}`);
            }
          }
        }
      }

      // Check for company suffixes
      if (!customer_name && cell.row >= 1 && cell.row <= 12) {
        if (cell.value.match(/\b(LLC|Inc\.?|Corp\.?|Company|Co\.?|Properties|Construction|Contracting|Services|Rentals|Roofing|Plumbing|Electric|Excavating|Hauling|Landscaping|Dumpsters?)\b/i)) {
          const candidateName = cell.value;
          if (!candidateName.toLowerCase().includes('king city') && candidateName.length > 3) {
            customer_name = candidateName;
            console.log(`Found customer name from company suffix: ${candidateName}`);
          }
        }
      }

      // Check row 6 specifically - this is where customer name typically appears
      if (!customer_name && cell.row === 6 && cell.col === 0) {
        const candidateName = cell.value;
        if (!candidateName.toLowerCase().includes('king city') &&
            !candidateName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase|family|address|kingcity)/) &&
            candidateName.length > 2) {
          customer_name = candidateName;
          console.log(`Found customer name from row 6: ${candidateName}`);
        }
      }
    }
  }

  // Fallback to customer ID
  if (!customer_name && customer_id_code) {
    customer_name = customer_id_code;
    console.log(`Using customer_id_code as name: ${customer_id_code}`);
  }

  console.log(`Customer ID: ${customer_id_code}`);
  console.log(`Customer Name: ${customer_name || '(not found)'}`);

  // Also show first 10 rows to understand structure
  console.log('\nFirst 10 rows:');
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const cells = row.map((c, idx) => `[${idx}]${String(c || '').substring(0, 25)}`).filter(c => !c.endsWith(']'));
    if (cells.length > 0) {
      console.log(`  Row ${i}: ${cells.join(' | ')}`);
    }
  }
}
