'use client';

import { useEffect, useState } from 'react';
import { fmtDate, toISO, weekDays } from '@/lib/dates';
import './grid.css';

const eur = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const label = (l) => (l.qty > 1 ? `${l.name} x${l.qty}` : l.name);

export default function Grid({ week, orders }) {
  const [users, setUsers] = useState([]);
  const [copied, setCopied] = useState(false);

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
    const head = ['', ...days.map((d) => d.name)].join('\t');
    const rows = names.map((n) => [n, ...days.map((d) => cell(n, d.date).map(label).join(', '))].join('\t'));
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
        <h3>Tabela nedelje</h3>
        <button className="btn sm" onClick={copyTable}>{copied ? 'Kopirano ✓' : 'Kopiraj tabelu'}</button>
      </div>

      <div className="grid-scroll">
        <table className="gtable">
          <thead>
            <tr>
              <th className="gname gcorner"></th>
              {days.map((d) => (
                <th key={d.date} className={d.date === today ? 'gtoday' : ''}>{d.name}<span>{d.date === today ? 'Danas' : fmtDate(d.date)}</span></th>
              ))}
              <th className="gsum">Iznos</th>
            </tr>
          </thead>
          <tbody>
            {names.map((n) => (
              <tr key={n}>
                <th className="gname">{n}</th>
                {days.map((d) => {
                  const lines = cell(n, d.date);
                  return (
                    <td key={d.date} className={d.date === today ? 'gtoday' : ''}>
                      {lines.length ? lines.map((l, i) => <div key={i}>{label(l)}</div>) : <span className="gempty">–</span>}
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
            {days.map((d) => {
              const lines = cell(n, d.date);
              return (
                <div key={d.date} className={'gcard-row' + (d.date === today ? ' gtoday' : '')}>
                  <span className="gday">{d.name.slice(0, 3)}</span>
                  <span className={lines.length ? '' : 'gempty'}>{lines.length ? lines.map(label).join(', ') : '–'}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
