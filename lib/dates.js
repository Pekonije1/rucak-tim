export const DAY_NAMES = ['Ponedeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'];

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function nextMondayISO() {
  return toISO(addDays(mondayOf(new Date()), 7));
}

export function weekDays(mondayISO) {
  const m = parseISO(mondayISO);
  return DAY_NAMES.map((name, i) => ({ name, date: toISO(addDays(m, i)) }));
}

export function fmtDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function currentMonth() {
  return toISO(new Date()).slice(0, 7);
}

// Sve nedelje (ponedeljci) koje imaju bar jedan dan u datom mjesecu 'YYYY-MM'
export function mondaysForMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0);
  let cur = mondayOf(new Date(y, m - 1, 1));
  const out = [];
  while (cur <= last) {
    out.push(toISO(cur));
    cur = addDays(cur, 7);
  }
  return out;
}

export const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;
