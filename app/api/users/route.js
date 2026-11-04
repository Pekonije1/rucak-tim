import { store } from '@/lib/db';
import { seedOnce } from '@/lib/seed';
import { isAdmin } from '@/lib/config';
import { PIN_RE, forbidden, getSession, hashPin, unauthorized } from '@/lib/auth';
import { mailConfigured, sendMail } from '@/lib/mail';
import { pinHtml } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pošalji PIN mejlom ako korisnik ima email. Vraća { mailed, mailError }
async function mailPin(name, pin, by) {
  const emails = await store.hgetall('emails');
  const to = emails[name];
  if (!to) return { mailed: false };
  if (!mailConfigured()) return { mailed: false, mailError: 'Gmail nije podešen' };
  try {
    await sendMail({ to, subject: `Tvoj PIN za Ručak 🔑`, html: pinHtml({ name, pin, by }), text: `Ćao ${name}, tvoj PIN za Ručak je ${pin}. Uđi ovdje: https://rucak-tim.vercel.app` });
    return { mailed: true, to };
  } catch (e) {
    return { mailed: false, mailError: String(e.message || e) };
  }
}

export const dynamic = 'force-dynamic';

// Javno: lista imena za ekran prijave, i ko već ima PIN
export async function GET() {
  await seedOnce();
  const users = await store.smembers('users');
  users.sort((a, b) => a.localeCompare(b, 'sr'));
  const pins = await store.hgetall('pins');
  return Response.json({ users, withPin: users.filter((u) => pins[u]) });
}

// Admin dodaje korisnika (PIN opciono, inače ga korisnik postavi pri prvoj prijavi)
export async function POST(req) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  if (!s.admin) return forbidden('Samo admin dodaje korisnike');
  const { name, pin, email } = await req.json();
  const clean = String(name || '').trim().slice(0, 40);
  const mail = String(email || '').trim().toLowerCase();
  if (mail && !EMAIL_RE.test(mail)) return Response.json({ error: 'Neispravan email' }, { status: 400 });
  if (!clean) return Response.json({ error: 'Unesi ime' }, { status: 400 });
  const users = await store.smembers('users');
  if (users.some((u) => u.toLowerCase() === clean.toLowerCase())) return Response.json({ error: 'Taj korisnik već postoji' }, { status: 400 });
  if (pin && !PIN_RE.test(String(pin))) return Response.json({ error: 'PIN mora imati 4 do 6 cifara' }, { status: 400 });
  await store.sadd('users', clean);
  if (pin) await store.hset('pins', clean, hashPin(pin));
  if (mail) await store.hset('emails', clean, mail);
  const m = pin ? await mailPin(clean, String(pin), s.name) : { mailed: false };
  return Response.json({ name: clean, ...m });
}

// Admin resetuje PIN (prazan PIN = korisnik postavlja novi pri sledećoj prijavi)
export async function PATCH(req) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  if (!s.admin) return forbidden();
  const { name, pin } = await req.json();
  if (pin) {
    if (!PIN_RE.test(String(pin))) return Response.json({ error: 'PIN mora imati 4 do 6 cifara' }, { status: 400 });
    await store.hset('pins', name, hashPin(pin));
    const m = await mailPin(name, String(pin), s.name);
    return Response.json({ ok: true, ...m });
  }
  await store.hdel('pins', name);
  return Response.json({ ok: true });
}

// Admin briše korisnika i sve njegove porudžbine
export async function DELETE(req) {
  const s = await getSession(req);
  if (!s) return unauthorized();
  if (!s.admin) return forbidden('Samo admin može da briše korisnike');
  const name = new URL(req.url).searchParams.get('name');
  if (!name) return Response.json({ error: 'Nedostaje ime' }, { status: 400 });
  if (isAdmin(name)) return Response.json({ error: 'Admin se ne može obrisati' }, { status: 400 });
  await store.srem('users', name);
  const weeks = await store.keys('week:*');
  for (const k of weeks) await store.hdel(k, name);
  await store.hdel('emails', name);
  await store.hdel('pins', name);
  return Response.json({ ok: true });
}
