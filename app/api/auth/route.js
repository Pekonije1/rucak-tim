import { store } from '@/lib/db';
import { PIN_RE, checkPin, clearCookie, getSession, hashPin, sessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Ko sam ja
export async function GET(req) {
  const s = await getSession(req);
  return Response.json({ user: s?.name || null, admin: !!s?.admin });
}

// Prijava: ime + PIN. Ako korisnik još nema PIN, ovim ga postavlja.
export async function POST(req) {
  const { name, pin } = await req.json();
  const users = await store.smembers('users');
  if (!users.includes(name)) return Response.json({ error: 'Nepoznat korisnik' }, { status: 400 });
  if (!PIN_RE.test(String(pin || ''))) return Response.json({ error: 'PIN mora imati 4 do 6 cifara' }, { status: 400 });

  const pins = await store.hgetall('pins');
  if (!pins[name]) {
    await store.hset('pins', name, hashPin(pin));
  } else if (!checkPin(pin, pins[name])) {
    return Response.json({ error: 'Pogrešan PIN' }, { status: 401 });
  }
  return Response.json({ user: name }, { headers: { 'Set-Cookie': sessionCookie(name) } });
}

// Odjava
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie() } });
}
