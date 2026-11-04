export const APP_URL = 'https://rucak-tim.vercel.app';

const SUBJECTS = [
  (n) => `Hoćemo li jesti šta naredne nedelje, ${n}? 🍽️`,
  (n) => `${n}, tvoja kolona u tabeli je prazna 👀`,
  (n) => `Pilad pitaju za tebe, ${n} 🐔`,
  (n) => `${n}, dostavljač je zabrinut 🛵`,
];

const LINES = [
  'Kuhinja se grije, dostavljač čeka, a tvoja kolona u tabeli je praznija od frižidera u petak popodne.',
  'Ostali su već izabrali. Ti si jedini koji još razmišlja između čizburgera i čizburgera.',
  'Ako ne izabereš do ponedeljka, ostaješ na kafi i ponosu. A to nije ručak.',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function reminderSubject(name, test) {
  return `${test ? '[TEST] ' : ''}${pick(SUBJECTS)(name)}`;
}

export function reminderLink(name, week) {
  return `${APP_URL}/?u=${encodeURIComponent(name)}&w=${week}`;
}

// thisWeek: nazivi jela koje je osoba jela ove nedelje
export function reminderHtml({ name, range, link, thisWeek, note, filled }) {
  const recap = thisWeek.length
    ? `Ove nedelje si smazao: <b>${thisWeek.map(esc).join(', ')}</b>. Respekt. 💪`
    : 'Ove nedelje si, po našim podacima, živio od kafe i entuzijazma. ☕';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1b19;">
      <tr><td style="background:#e8590c;background:linear-gradient(135deg,#f5a04a,#e8590c);padding:28px 28px 22px;text-align:center;">
        <div style="font-size:46px;line-height:1;">🍔🐔🍕</div>
        <div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:12px;opacity:.9;">Ručak · ${esc(range)}</div>
      </td></tr>
      <tr><td style="padding:28px;">
        ${note ? `<div style="border-left:4px solid #e8590c;background:#faf8f5;border-radius:0 12px 12px 0;padding:14px 16px;margin:0 0 20px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#e8590c;margin-bottom:6px;">📣 Poruka od ${esc(note.from)}</div>
          <div style="font-size:16px;line-height:1.5;color:#1c1b19;white-space:pre-line;">${esc(note.text)}</div>
        </div>` : ''}
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">${filled ? `Sve je spremno za narednu nedelju, ${esc(name)} 👌` : `Hoćemo li jesti šta naredne nedelje, ${esc(name)}?`}</h1>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#4a4844;">${filled ? 'Već si izabrao ručak. Ako si se predomislio, link je ispod.' : pick(LINES)}</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4844;">${recap}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr><td style="border-radius:12px;background:#e8590c;">
            <a href="${link}" style="display:inline-block;padding:15px 28px;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Izaberi ručak 🍽️</a>
          </td></tr>
        </table>
        <div style="background:#fff0e6;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.5;color:#8a3a0a;">
          💡 <b>Mrzi te?</b> Otvori link i klikni <i>„Kopiraj prethodnu nedelju”</i>. Gotov si za 3 sekunde, a niko neće znati.
        </div>
      </td></tr>
      <tr><td style="padding:0 28px 24px;font-size:12px;line-height:1.5;color:#a09d96;text-align:center;">
        Ovaj podsjetnik stiže petkom jer brinemo za tvoj stomak.<br>Ne želiš ga? Obriši email u Profilu.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
