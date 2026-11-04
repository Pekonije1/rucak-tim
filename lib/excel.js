import { weekDays } from '@/lib/dates';

const ORANGE = 'FFE8955A';
const BLUE = 'FF1F3FA8';
const WHITE = 'FFFFFFFF';
const FONT = { name: 'Times New Roman', size: 14 };
const thin = { style: 'thin', color: { argb: 'FF7F7F7F' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

// Pravi .xlsx u istom izgledu kao stari Excel: imena lijevo, dani gore
export async function buildWeekWorkbook(ExcelJS, week, names, orders) {
  const days = weekDays(week);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Za zaposlene');
  ws.columns = [{ width: 18 }, ...days.map(() => ({ width: 26 }))];

  const header = ws.addRow(['', ...days.map((d) => d.name)]);
  header.height = 36;
  header.eachCell({ includeEmpty: true }, (c, col) => {
    if (col === 1) return;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };
    c.font = { ...FONT, size: 16, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = BORDER;
  });

  for (const n of names) {
    const meals = days.map((d) => (orders?.[n]?.days?.[d.date] || []).map((l) => l.name).join(', '));
    const row = ws.addRow([n, ...meals]);
    row.height = 40;
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = BORDER;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (col === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        c.font = { ...FONT, bold: true, color: { argb: WHITE } };
      } else {
        c.font = FONT;
      }
    });
  }
  return wb;
}

export async function downloadWeekXlsx(week, orders) {
  const ExcelJS = (await import('exceljs')).default;
  const users = await fetch('/api/users', { cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => d.users || [])
    .catch(() => []);
  const names = [...new Set([...users, ...Object.keys(orders || {})])];
  const wb = await buildWeekWorkbook(ExcelJS, week, names, orders);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rucak-${week}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
