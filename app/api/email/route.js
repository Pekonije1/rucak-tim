import { store } from '@/lib/db';
import { ADMIN } from '@/lib/config';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req) {
  const user = new URL(req.url).searchParams.get('user');
  const emails = await store.hgetall('emails');
  if (!user) {
    // Svi mejlovi, samo za admina
    if (req.headers.get('x-user') !== ADMIN) return Response.json({ error: 'Nije dozvoljeno' }, { status: 403 });
    return Response.json({ emails });
  }
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
