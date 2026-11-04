import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';
import { WEEK_RE, weekDays } from '@/lib/dates';
import { MEAL_PRICE } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  await seedOnce();
  const week = new URL(req.url).searchParams.get('week');
  if (!WEEK_RE.test(week || '')) return Response.json({ error: 'Neispravna nedelja' }, { status: 400 });
  const orders = await store.hgetall(`week:${week}`);
  return Response.json({ orders });
}

export async function PUT(req) {
  const { week, user, days } = await req.json();
  if (!WEEK_RE.test(week || '')) return Response.json({ error: 'Neispravna nedelja' }, { status: 400 });
  const name = String(user || '').trim();
  if (!name) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });

  const allowed = new Set(weekDays(week).map((d) => d.date));
  const clean = {};
  for (const [date, lines] of Object.entries(days || {})) {
    if (!allowed.has(date) || !Array.isArray(lines)) continue;
    const ok = lines
      .map((l) => ({
        itemId: String(l.itemId || ''),
        name: String(l.name || '').slice(0, 80),
        price: MEAL_PRICE,
        qty: 1,
      }))
      .filter((l) => l.name)
      .slice(0, 1);
    if (ok.length) clean[date] = ok;
  }

  await store.sadd('users', name);
  if (Object.keys(clean).length === 0) {
    await store.hdel(`week:${week}`, name);
  } else {
    await store.hset(`week:${week}`, name, { days: clean, updatedAt: new Date().toISOString() });
  }
  return Response.json({ ok: true, days: clean });
}
