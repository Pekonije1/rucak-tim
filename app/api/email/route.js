import { store } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req) {
  const user = new URL(req.url).searchParams.get('user');
  if (!user) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });
  const emails = await store.hgetall('emails');
  return Response.json({ email: emails[user] || '' });
}

export async function PUT(req) {
  const { user, email } = await req.json();
  const name = String(user || '').trim();
  const clean = String(email || '').trim().toLowerCase();
  if (!name) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });
  if (!clean) {
    await store.hdel('emails', name);
    return Response.json({ email: '' });
  }
  if (!EMAIL_RE.test(clean)) return Response.json({ error: 'Neispravan email' }, { status: 400 });
  await store.hset('emails', name, clean);
  return Response.json({ email: clean });
}
