import { store } from '@/lib/db';
import { forbidden, getSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  const user = new URL(req.url).searchParams.get('user');
  const emails = await store.hgetall('emails');
  if (!user) {
    if (!s.admin) return forbidden();
    return Response.json({ emails });
  }
  if (user !== s.name && !s.admin) return forbidden();
  return Response.json({ email: emails[user] || '' });
}

export async function PUT(req) {
  const { user, email } = await req.json();
  const name = String(user || '').trim();
  const clean = String(email || '').trim().toLowerCase();
  if (!name) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });
  const s = await getSession(req);
  if (!s) return unauthorized();
  if (name !== s.name && !s.admin) return forbidden();
  if (!clean) {
    await store.hdel('emails', name);
    return Response.json({ email: '' });
  }
  if (!EMAIL_RE.test(clean)) return Response.json({ error: 'Neispravan email' }, { status: 400 });
  await store.hset('emails', name, clean);
  return Response.json({ email: clean });
}
