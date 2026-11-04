import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';

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
