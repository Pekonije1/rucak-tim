import nodemailer from 'nodemailer';
import { store } from '@/lib/db';
import { addDays, fmtDate, mondayOf, parseISO, toISO, weekDays } from '@/lib/dates';
import { reminderHtml, reminderLink, reminderSubject } from '@/lib/email';

function nextMondayPodgorica() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Podgorica' }).format(new Date());
  return toISO(addDays(mondayOf(parseISO(today)), 7));
}

// mode: 'missing' (nisu popunili narednu nedelju), 'all' (svi sa mejlom), 'self' (samo requester, test)
export async function runReminders({ mode, requester, message }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { ok: false, error: 'Nije podešen Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)', sent: [], failed: [] };
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

  let targets = Object.entries(emails);
  if (mode === 'self') targets = targets.filter(([name]) => name === requester);
  if (mode === 'missing') targets = targets.filter(([name]) => !Object.keys(orders?.[name]?.days || {}).length);

  if (!targets.length) {
    const note = mode === 'self' ? 'Upiši svoj email u Profil' : 'Nema kome da se šalje';
    return { ok: true, week, sent: [], failed: [], note };
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });

  const note = message ? { from: requester, text: String(message).slice(0, 1000) } : null;
  const sent = [];
  const failed = [];
  for (const [name, to] of targets) {
    try {
      const link = reminderLink(name, week);
      const thisWeek = Object.keys(current?.[name]?.days || {}).sort().map((d) => current[name].days[d][0]?.name).filter(Boolean);
      const filled = Object.keys(orders?.[name]?.days || {}).length > 0;
      await transport.sendMail({
        from: `"Ručak 🍽️" <${process.env.GMAIL_USER}>`,
        to,
        subject: reminderSubject(name, mode === 'self'),
        html: reminderHtml({ name, range, link, thisWeek, note, filled }),
        text: `${note ? `Poruka od ${note.from}: ${note.text}\n\n` : ''}Hoćemo li jesti šta naredne nedelje, ${name}? Izaberi ručak za ${range}: ${link}`,
      });
      sent.push(name);
    } catch (e) {
      failed.push({ name, error: String(e.message || e) });
    }
  }
  return { ok: failed.length === 0, week, sent, failed };
}
