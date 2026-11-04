import { store } from '@/lib/db';
import { MONTH_RE, mondaysForMonth } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// Sva jela po osobi za mjesec, plus dani kad je bilo koga porudžbina
export async function GET(req) {
  const month = new URL(req.url).searchParams.get('month');
  if (!MONTH_RE.test(month || '')) return Response.json({ error: 'Neispravan mjesec' }, { status: 400 });

  const mondays = mondaysForMonth(month);
  const weeks = await Promise.all(mondays.map((m) => store.hgetall(`week:${m}`)));
  const names = await store.smembers('users');

  const users = {};
  names.forEach((n) => (users[n] = []));
  const active = new Set();

  weeks.forEach((w) => {
    for (const [name, order] of Object.entries(w || {})) {
      for (const [date, lines] of Object.entries(order?.days || {})) {
        if (!date.startsWith(month)) continue;
        for (const l of lines) {
          (users[name] ??= []).push({ date, name: l.name });
          active.add(date);
        }
      }
    }
  });

  return Response.json({
    month,
    activeDays: [...active].sort(),
    users: Object.entries(users).map(([name, meals]) => ({
      name,
      meals: meals.sort((a, b) => a.date.localeCompare(b.date)),
    })),
  });
}
