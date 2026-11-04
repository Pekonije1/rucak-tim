import { store } from '@/lib/db';
import { MONTH_RE, mondaysForMonth } from '@/lib/dates';

import { getSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Mjesečni obračun po zaposlenom (računa se po datumu jela, ne po nedelji)
export async function GET(req) {
  if (!(await getSession(req))) return unauthorized();
  const month = new URL(req.url).searchParams.get('month');
  if (!MONTH_RE.test(month || '')) return Response.json({ error: 'Neispravan mjesec' }, { status: 400 });

  const mondays = mondaysForMonth(month);
  const weeks = await Promise.all(mondays.map((m) => store.hgetall(`week:${m}`)));
  const names = await store.smembers('users');

  const users = {};
  const get = (name) => (users[name] ??= { name, meals: 0, total: 0, weeks: {} });
  names.forEach(get);

  mondays.forEach((monday, i) => {
    for (const [name, order] of Object.entries(weeks[i] || {})) {
      for (const [date, lines] of Object.entries(order?.days || {})) {
        if (!date.startsWith(month)) continue;
        const u = get(name);
        const w = (u.weeks[monday] ??= { meals: 0, total: 0 });
        for (const l of lines) {
          u.meals += l.qty;
          u.total += l.qty * l.price;
          w.meals += l.qty;
          w.total += l.qty * l.price;
        }
      }
    }
  });

  const list = Object.values(users).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  return Response.json({ month, users: list });
}
