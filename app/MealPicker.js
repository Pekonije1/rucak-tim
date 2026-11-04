'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import './mealpicker.css';

// "pileci cevapi" nalazi "Pileći ćevapi"
const norm = (s) => s.toLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function MealPicker({ value, label, menu, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const list = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return menu;
    return menu.filter((m) => {
      const t = norm(m.name);
      return words.every((w) => t.includes(w));
    });
  }, [q, menu]);

  function pick(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="mp" ref={ref}>
      <button type="button" className={'input mp-btn' + (label ? ' mp-set' : '')} onClick={() => setOpen((o) => !o)}>
        <span>{label || 'Izaberi jelo'}</span>
        <span className="mp-caret">▾</span>
      </button>

      {open && (
        <>
          <div className="mp-backdrop" onClick={() => setOpen(false)} />
          <div className="mp-pop" role="dialog">
            <input
              ref={inputRef}
              className="input mp-search"
              placeholder="Pretraži jela…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) pick(list[0].id); }}
            />
            <div className="mp-list">
              {value && !q && (
                <button type="button" className="mp-item mp-none" onClick={() => pick('')}>Bez jela</button>
              )}
              {list.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={'mp-item' + (m.id === value ? ' active' : '')}
                  onClick={() => pick(m.id)}
                >
                  {m.name}
                </button>
              ))}
              {list.length === 0 && <p className="muted small mp-empty">Nema jela za „{q}”</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
