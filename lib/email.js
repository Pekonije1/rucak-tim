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
    ? `Ove nedelje si smazao: <b style="color:#121826;">${thisWeek.map(esc).join(', ')}</b>. Respekt. 💪`
    : 'Ove nedelje si, po našim podacima, živio od kafe i entuzijazma. ☕';
  const sq = (c) => `<td style="width:9px;height:9px;background:${c};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>`;
  const font = "'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e7ec;border-radius:10px;overflow:hidden;font-family:${font};color:#0b0f19;">
      <tr><td style="background:#121826;padding:16px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="2" style="display:inline-table;vertical-align:middle;"><tr>${sq('#2f5bff')}${sq('#e0283f')}</tr><tr>${sq('#f2b23a')}${sq('#12b76a')}</tr></table>
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.4px;vertical-align:middle;margin-left:8px;">Ručak 🍽️</span>
          </td>
          <td align="right" style="color:#f2b23a;font-size:13px;font-weight:600;vertical-align:middle;">${esc(range)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;font-size:0;line-height:0;background:#2f5bff;background-image:linear-gradient(90deg,#2f5bff 0 20%,#e0283f 20% 40%,#f2b23a 40% 60%,#12b76a 60% 80%,#7a5af8 80% 100%);">&nbsp;</td></tr>
      <tr><td style="padding:26px 24px 8px;text-align:center;font-size:40px;line-height:1;">🍔 🐔 🍕</td></tr>
      <tr><td style="padding:14px 24px 24px;">
        ${note ? `<div style="border-left:4px solid #e0283f;background:#fdecee;padding:12px 14px;margin:0 0 20px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#a3142a;margin-bottom:5px;">📣 Poruka od ${esc(note.from)}</div>
          <div style="font-size:15px;line-height:1.5;color:#0b0f19;white-space:pre-line;">${esc(note.text)}</div>
        </div>` : ''}
        <h1 style="margin:0 0 10px;font-size:23px;line-height:1.25;letter-spacing:-0.5px;font-weight:700;">${filled ? `Sve je spremno za narednu nedelju, ${esc(name)} 👌` : `Hoćemo li jesti šta naredne nedelje, ${esc(name)}?`}</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#475467;">${filled ? 'Već si izabrao ručak. Ako si se predomislio, link je ispod.' : pick(LINES)}</p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.55;color:#475467;">${recap}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
          <tr><td style="border-radius:6px;background:#2f5bff;">
            <a href="${link}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">Izaberi ručak →</a>
          </td></tr>
        </table>
        <div style="background:#fef5e2;border:1px solid #f2b23a;border-radius:6px;padding:12px 14px;font-size:14px;line-height:1.5;color:#7a4f00;">
          💡 <b>Mrzi te?</b> Otvori link i klikni <i>„Kopiraj prethodnu nedelju”</i>. Gotov si za 3 sekunde, a niko neće znati.
        </div>
      </td></tr>
      <tr><td style="padding:14px 24px 18px;border-top:1px solid #e4e7ec;font-size:12px;line-height:1.5;color:#98a2b3;text-align:center;">
        Podsjetnik stiže petkom jer brinemo za tvoj stomak. Ne želiš ga? Obriši email u Profilu.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
