'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { viewImage } from '@/lib/image';
import './mealpicker.css';

// "pileci cevapi" nalazi "Pileći ćevapi"
const norm = (s) => s.toLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function MealPicker({ value, label, menu, onChange, compact = false, placeholder = 'Izaberi jelo' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const current = menu.find((m) => m.id === value);

  useEffect(() => {
    if (!open) return;
    setQ('');
    if (compact && window.innerWidth >= 640 && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const width = Math.max(r.width, 280);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const below = window.innerHeight - r.bottom > 360;
      setPos(below ? { top: r.bottom + 6, left, width } : { bottom: window.innerHeight - r.top + 6, left, width });
    } else {
      setPos(null);
    }
    const onScroll = (e) => { if (compact && !ref.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
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
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, compact]);

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
    setTimeout(() => btnRef.current?.focus(), 0);
  }

  return (
    <div className={'mp' + (compact ? ' mp-compact' : '')} ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className={(compact ? 'mp-cell' : 'input mp-btn') + (label ? ' mp-set' : '')}
        onClick={() => setOpen((o) => !o)}
      >
        {!compact && current?.image && (
          <img
            className="mp-thumb"
            src={current.image}
            alt=""
            onClick={(e) => { e.stopPropagation(); viewImage(current.image, current.name); }}
          />
        )}
        <span className="mp-label">{label || placeholder}</span>
        {!compact && <span className="mp-caret">▾</span>}
      </button>

      {open && (
        <>
          <div className="mp-backdrop" onClick={() => setOpen(false)} />
          <div className={'mp-pop' + (pos ? ' mp-fixed' : '')} role="dialog" style={pos ? { ...pos, right: 'auto' } : undefined}>
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
                  {m.image ? <img className="mp-item-thumb" src={m.image} alt="" loading="lazy" /> : <span className="mp-item-thumb empty">🍽️</span>}
                  <span>{m.name}</span>
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
