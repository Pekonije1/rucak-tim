import { del, put } from '@vercel/blob';
import { store } from '@/lib/db';
import { getSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 1.5 * 1024 * 1024; // slika je već kompresovana u browseru
const TYPES = ['image/webp', 'image/jpeg', 'image/png'];

async function getItem(id) {
  const menu = await store.hgetall('menu');
  return menu[id] || null;
}

// Upload slike za jelo: tijelo zahtjeva je sama slika
export async function POST(req) {
  if (!(await getSession(req))) return unauthorized();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: 'Slike nisu podešene' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id');
  const item = id && (await getItem(id));
  if (!item) return Response.json({ error: 'Jelo ne postoji' }, { status: 404 });

  const type = (req.headers.get('content-type') || '').split(';')[0];
  if (!TYPES.includes(type)) return Response.json({ error: 'Pošalji sliku (webp, jpg ili png)' }, { status: 400 });
  const body = await req.arrayBuffer();
  if (!body.byteLength) return Response.json({ error: 'Prazna slika' }, { status: 400 });
  if (body.byteLength > MAX_BYTES) return Response.json({ error: 'Slika je prevelika' }, { status: 413 });

  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  const blob = await put(`menu/${id}.${ext}`, body, {
    access: 'public',
    contentType: type,
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  if (item.image) await del(item.image).catch(() => {});
  const updated = { ...item, image: blob.url };
  await store.hset('menu', id, updated);
  return Response.json({ item: updated });
}

// Brisanje slike jela
export async function DELETE(req) {
  if (!(await getSession(req))) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  const item = id && (await getItem(id));
  if (!item) return Response.json({ error: 'Jelo ne postoji' }, { status: 404 });
  if (item.image && process.env.BLOB_READ_WRITE_TOKEN) await del(item.image).catch(() => {});
  const { image, ...rest } = item;
  await store.hset('menu', id, rest);
  return Response.json({ item: rest });
}
