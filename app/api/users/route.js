import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';
import { ADMIN } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  await seedOnce();
  const users = await store.smembers('users');
  users.sort((a, b) => a.localeCompare(b, 'sr'));
  return Response.json({ users });
}

export async function POST(req) {
  const { name } = await req.json();
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return Response.json({ error: 'Unesi ime' }, { status: 400 });
  const users = await store.smembers('users');
  const existing = users.find((u) => u.toLowerCase() === clean.toLowerCase());
  if (existing) return Response.json({ name: existing });
  await store.sadd('users', clean);
  return Response.json({ name: clean });
}

// Brisanje korisnika i svih njegovih porudžbina (samo admin)
export async function DELETE(req) {
  if (req.headers.get('x-user') !== ADMIN) return Response.json({ error: 'Samo ' + ADMIN + ' može da briše korisnike' }, { status: 403 });
  const name = new URL(req.url).searchParams.get('name');
  if (!name) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });
  if (name === ADMIN) return Response.json({ error: 'Ne možeš obrisati sebe' }, { status: 400 });
  await store.srem('users', name);
  const weeks = await store.keys('week:*');
  for (const k of weeks) await store.hdel(k, name);
  await store.hdel('emails', name);
  return Response.json({ ok: true });
}
