import nodemailer from 'nodemailer';
import { store } from '@/lib/db';
import { isAdmin } from '@/lib/config';
import { addDays, fmtDate, mondayOf, parseISO, toISO, weekDays } from '@/lib/dates';
import { reminderHtml, reminderLink, reminderSubject } from '@/lib/email';

export const dynamic = 'force-dynamic';

function nextMondayPodgorica() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Podgorica' }).format(new Date());
  return toISO(addDays(mondayOf(parseISO(today)), 7));
}

// Vercel Cron petkom: podsjeti sve koji imaju email, a nisu popunili narednu nedelju.
// ?test=1 sa x-user: Peko šalje probni mejl samo Peku.
export async function GET(req) {
  const url = new URL(req.url);
  const test = url.searchParams.get('test') === '1';
  const isCron = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const tester = req.headers.get('x-user');
  const isAdminTest = test && isAdmin(tester);
  if (!process.env.CRON_SECRET || (!isCron && !isAdminTest)) {
    return Response.json({ error: 'Nije dozvoljeno' }, { status: 401 });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return Response.json({ error: 'Nije podešen Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)' }, { status: 500 });
  }

  const week = nextMondayPodgorica();
  const days = weekDays(week);
  const range = `${fmtDate(days[0].date)} – ${fmtDate(days[4].date)}`;
  const thisMonday = toISO(addDays(parseISO(week), -7));
  const [emails, orders, current] = await Promise.all([
    store.hgetall('emails'),
    store.hgetall(`week:${week}`),
    store.hgetall(`week:${thisMonday}`),
  ]);

  const targets = test
    ? (emails[tester] ? [[tester, emails[tester]]] : [])
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
      const link = reminderLink(name, week);
      const thisWeek = Object.keys(current?.[name]?.days || {}).sort().map((d) => current[name].days[d][0]?.name).filter(Boolean);
      await transport.sendMail({
        from: `"Ručak 🍽️" <${process.env.GMAIL_USER}>`,
        to,
        subject: reminderSubject(name, test),
        html: reminderHtml({ name, range, link, thisWeek }),
        text: `Hoćemo li jesti šta naredne nedelje, ${name}? Izaberi ručak za ${range}: ${link}`,
      });
      sent.push(name);
    } catch (e) {
      failed.push({ name, error: String(e.message || e) });
    }
  }
  return Response.json({ ok: failed.length === 0, week, sent, failed });
}
