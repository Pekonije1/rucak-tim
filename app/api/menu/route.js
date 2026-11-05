import { del } from '@vercel/blob';
import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';
import { MEAL_PRICE } from '@/lib/config';
import { getSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!(await getSession(req))) return unauthorized();
  await seedOnce();
  const items = Object.values(await store.hgetall('menu'));
  items.sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  return Response.json({ items });
}

export async function POST(req) {
  if (!(await getSession(req))) return unauthorized();
  const body = await req.json();
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return Response.json({ error: 'Unesi naziv jela' }, { status: 400 });
  const id = body.id || crypto.randomUUID();
  const existing = body.id ? (await store.hgetall('menu'))[body.id] : null;
  const item = { id, name, price: MEAL_PRICE, ...(existing?.image ? { image: existing.image } : {}) };
  await store.hset('menu', id, item);
  return Response.json({ item });
}

export async function DELETE(req) {
  if (!(await getSession(req))) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Nedostaje id' }, { status: 400 });
  const item = (await store.hgetall('menu'))[id];
  if (item?.image && process.env.BLOB_READ_WRITE_TOKEN) await del(item.image).catch(() => {});
  await store.hdel('menu', id);
  return Response.json({ ok: true });
}
