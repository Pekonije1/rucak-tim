import nodemailer from 'nodemailer';
import { store } from '@/lib/db';
import { ADMIN } from '@/lib/config';
import { addDays, fmtDate, mondayOf, parseISO, toISO, weekDays } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const APP_URL = 'https://rucak-tim.vercel.app';

function nextMondayPodgorica() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Podgorica' }).format(new Date());
  return toISO(addDays(mondayOf(parseISO(today)), 7));
}

function html(name, range) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1b19">
  <div style="font-size:32px">🍽️</div>
  <h2 style="margin:8px 0">Ćao ${name}, gladan si sledeće nedelje?</h2>
  <p style="color:#6f6c66;line-height:1.5">Još nisi izabrao ručak za <b>${range}</b>. Treba ti minut, a ako ti se jede isto kao ove nedelje, samo klikni "Kopiraj prethodnu nedelju".</p>
  <p style="margin:24px 0"><a href="${APP_URL}" style="background:#e8590c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">Popuni ručak</a></p>
  <p style="color:#a09d96;font-size:12px">Ovaj podsjetnik stiže petkom. Isključuješ ga tako što obrišeš email u Profilu.</p>
</div>`;
}

// Vercel Cron petkom: podsjeti sve koji imaju email, a nisu popunili narednu nedelju.
// ?test=1 sa x-user: Peko šalje probni mejl samo Peku.
export async function GET(req) {
  const url = new URL(req.url);
  const test = url.searchParams.get('test') === '1';
  const isCron = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const isAdminTest = test && req.headers.get('x-user') === ADMIN;
  if (!process.env.CRON_SECRET || (!isCron && !isAdminTest)) {
    return Response.json({ error: 'Nije dozvoljeno' }, { status: 401 });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return Response.json({ error: 'Nije podešen Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)' }, { status: 500 });
  }

  const week = nextMondayPodgorica();
  const days = weekDays(week);
  const range = `${fmtDate(days[0].date)} – ${fmtDate(days[4].date)}`;
  const [emails, orders] = await Promise.all([store.hgetall('emails'), store.hgetall(`week:${week}`)]);

  const targets = test
    ? (emails[ADMIN] ? [[ADMIN, emails[ADMIN]]] : [])
    : Object.entries(emails).filter(([name]) => !Object.keys(orders?.[name]?.days || {}).length);

  if (!targets.length) {
    return Response.json({ ok: true, week, sent: [], note: test ? 'Upiši svoj email u Profil' : 'Nema kome da se šalje' });
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });

  const sent = [];
  const failed = [];
  for (const [name, to] of targets) {
    try {
      await transport.sendMail({
        from: `"Ručak 🍽️" <${process.env.GMAIL_USER}>`,
        to,
        subject: `${test ? '[TEST] ' : ''}Izaberi ručak za ${range}`,
        html: html(name, range),
        text: `Ćao ${name}, još nisi izabrao ručak za ${range}. Popuni ovdje: ${APP_URL}`,
      });
      sent.push(name);
    } catch (e) {
      failed.push({ name, error: String(e.message || e) });
    }
  }
  return Response.json({ ok: failed.length === 0, week, sent, failed });
}
