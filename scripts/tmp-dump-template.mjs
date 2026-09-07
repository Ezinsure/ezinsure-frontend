import * as XLSX from '@e965/xlsx';
import fs from 'node:fs';

const files = process.argv.slice(2);
for (const f of files) {
  const buf = fs.readFileSync(f);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  console.log('=== FILE:', f);
  console.log('SHEETS:', JSON.stringify(wb.SheetNames));
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: true,
    });
    console.log(`--- SHEET: ${name} rows=${matrix.length}`);
    matrix.forEach((row, i) => {
      const cells = row.map((c) => String(c ?? '').trim());
      if (!cells.some(Boolean)) return;
      console.log(`R${i}:`, JSON.stringify(cells));
    });
    console.log('MERGES:', JSON.stringify(sheet['!merges'] ?? []));
  }
}
