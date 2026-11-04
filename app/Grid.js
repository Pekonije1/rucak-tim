'use client';

import { useEffect, useState } from 'react';
import { fmtDate, toISO, weekDays } from '@/lib/dates';
import MealPicker from './MealPicker';
import { MEAL_PRICE } from '@/lib/config';
import './grid.css';

const eur = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const label = (l) => (l.qty > 1 ? `${l.name} x${l.qty}` : l.name);

export default function Grid({ week, orders, menu = [], editable = false, onEdit }) {
  const [users, setUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  async function setCell(n, date, itemId) {
    const days = { ...(orders?.[n]?.days || {}) };
    if (itemId) {
      const item = menu.find((m) => m.id === itemId);
      if (!item) return;
      days[date] = [{ itemId: item.id, name: item.name, price: MEAL_PRICE, qty: 1 }];
    } else {
      delete days[date];
    }
    setErr('');
    onEdit?.(n, days);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week, user: n, days }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setErr(`Nije sačuvano za ${n}, pokušaj ponovo.`);
    }
  }

  const editCell = (n, date, lines) => (
    <MealPicker
      compact
      value={lines[0]?.itemId || ''}
      label={lines[0]?.name}
      placeholder="–"
      menu={menu}
      onChange={(id) => setCell(n, date, id)}
    />
  );

  useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  const days = weekDays(week);
  const today = toISO(new Date());
  const names = [...new Set([...users, ...Object.keys(orders || {})])];
  const cell = (n, date) => orders?.[n]?.days?.[date] || [];
  const total = (n) =>
    Object.values(orders?.[n]?.days || {}).flat().reduce((s, l) => s + l.qty * l.price, 0);

  async function copyTable() {
    const head = ['', ...days.map((d, i) => d.name)].join('\t');
    const rows = names.map((n) => [n, ...days.map((d, i) => cell(n, d.date).map(label).join(', '))].join('\t'));
    const text = [head, ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card grid-card">
      <div className="day-head">
        <h3>Tabela nedelje{editable && <span className="muted small" style={{ fontWeight: 500 }}> · admin: klikni ćeliju da promijeniš</span>}</h3>
        <button className="btn sm" onClick={copyTable}>{copied ? 'Kopirano ✓' : 'Kopiraj tabelu'}</button>
      </div>

      {err && <p className="error">{err}</p>}
      <div className="grid-scroll">
        <table className="gtable">
          <thead>
            <tr>
              <th className="gname gcorner"></th>
              {days.map((d, i) => (
                <th key={d.date} data-dow={i} className={d.date === today ? 'gtoday' : ''}>{d.name}<span>{d.date === today ? 'Danas' : fmtDate(d.date)}</span></th>
              ))}
              <th className="gsum">Iznos</th>
            </tr>
          </thead>
          <tbody>
            {names.map((n) => (
              <tr key={n}>
                <th className="gname">{n}</th>
                {days.map((d, i) => {
                  const lines = cell(n, d.date);
                  return (
                    <td key={d.date} className={(d.date === today ? 'gtoday' : '') + (editable ? ' gedit' : '')}>
                      {editable
                        ? editCell(n, d.date, lines)
                        : lines.length ? lines.map((l, i) => <div key={i}>{label(l)}</div>) : <span className="gempty">–</span>}
                    </td>
                  );
                })}
                <td className="gsum">{eur(total(n))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gcards">
        {names.map((n) => (
          <div key={n} className="gcard">
            <div className="gcard-head">
              <strong>{n}</strong>
              <span className="pill">{eur(total(n))}</span>
            </div>
            {days.map((d, i) => {
              const lines = cell(n, d.date);
              return (
                <div key={d.date} data-dow={i} className={'gcard-row' + (d.date === today ? ' gtoday' : '')}>
                  <span className="gday">{d.name.slice(0, 3)}</span>
                  {editable
                    ? <div className="grow">{editCell(n, d.date, lines)}</div>
                    : <span className={lines.length ? '' : 'gempty'}>{lines.length ? lines.map(label).join(', ') : '–'}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
