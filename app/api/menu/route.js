import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';
import { MEAL_PRICE } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedOnce();
  const items = Object.values(await store.hgetall('menu'));
  items.sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  return Response.json({ items });
}

export async function POST(req) {
  const body = await req.json();
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return Response.json({ error: 'Unesi naziv jela' }, { status: 400 });
  const id = body.id || crypto.randomUUID();
  const item = { id, name, price: MEAL_PRICE };
  await store.hset('menu', id, item);
  return Response.json({ item });
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Nedostaje id' }, { status: 400 });
  await store.hdel('menu', id);
  return Response.json({ ok: true });
}
