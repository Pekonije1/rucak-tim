'use client';

import { useEffect, useMemo, useState } from 'react';
import { currentMonth } from '@/lib/dates';
import { computeFame } from '@/lib/fame';
import './fame.css';

const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
const monthLabel = (m) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}.`;

export default function Fame() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(null);
    fetch(`/api/fame?month=${month}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ users: [], activeDays: [] }));
  }, [month]);

  const fame = useMemo(() => (data ? computeFame(data) : null), [data]);
  const won = fame ? fame.awards.filter((a) => a.winners.length) : [];
  const maxKcal = fame ? Math.max(1, ...fame.people.map((p) => p.kcal)) : 1;

  async function copy() {
    const text = [
      `🏆 Hall of fame, ${monthLabel(month)}`,
      '',
      ...won.map((a) => `${a.emoji} ${a.title}: ${a.winners.map((w) => `${w.name} (${w.label})`).join(', ')}`),
    ].join('\n');
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
    <section>
      <div className="fame-head">
        <div>
          <h2>🏆 Hall of fame</h2>
          <p className="muted small">Titule za {monthLabel(month)} Kalorije su procjena od oka, ne nauka.</p>
        </div>
        <input type="month" className="input month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>

      {!fame ? (
        <p className="muted center">Računam ko je koliko pojeo…</p>
      ) : won.length === 0 ? (
        <div className="card empty"><p className="muted">Ovog mjeseca još niko ništa nije pojeo. Sumnjivo.</p></div>
      ) : (
        <>
          <div className="actions">
            <button className="btn primary" onClick={copy}>{copied ? 'Kopirano ✓' : 'Kopiraj za grupu'}</button>
          </div>

          <div className="fame-grid">
            {won.map((a) => (
              <div key={a.id} className="card fame-card">
                <div className="fame-emoji">{a.emoji}</div>
                <div className="fame-body">
                  <div className="fame-title">{a.title}</div>
                  {a.winners.map((w) => (
                    <div key={w.name} className="fame-winner">
                      <strong>{w.name}</strong>
                      <span className="pill">{w.label}</span>
                    </div>
                  ))}
                  <p className="muted small fame-desc">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>🔥 Kalorijska liga</h3>
            <div className="kcal-list">
              {[...fame.people].sort((a, b) => b.kcal - a.kcal).map((p) => (
                <div key={p.name} className="kcal-row">
                  <span className="kcal-name">{p.name}</span>
                  <div className="kcal-bar"><div style={{ width: `${(p.kcal / maxKcal) * 100}%` }} /></div>
                  <span className="kcal-val">{p.kcal ? `~${p.kcal.toLocaleString('sr-RS')}` : '☕'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
