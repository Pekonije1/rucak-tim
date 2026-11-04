import crypto from 'crypto';
import { store } from '@/lib/db';
import { isAdmin } from '@/lib/config';

const COOKIE = 'rucak_s';
const MAX_AGE = 60 * 60 * 24 * 180; // 6 mjeseci
const SECRET = process.env.SESSION_SECRET || 'dev-secret-samo-lokalno';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString('utf8');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export const PIN_RE = /^\d{4,6}$/;

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function checkPin(pin, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pin), salt, 32);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

export function sessionCookie(name) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const data = `${b64(name)}.${exp}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${data}.${sign(data)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Vraća { name, admin } ili null
export async function getSession(req) {
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [n, exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!n || !exp || !sig) return null;
  const expected = sign(`${n}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const name = unb64(n);
  const users = await store.smembers('users');
  if (!users.includes(name)) return null; // obrisan korisnik
  return { name, admin: isAdmin(name) };
}

export const unauthorized = () => Response.json({ error: 'Prijavi se ponovo' }, { status: 401 });
export const forbidden = (msg = 'Samo admin može ovo') => Response.json({ error: msg }, { status: 403 });
