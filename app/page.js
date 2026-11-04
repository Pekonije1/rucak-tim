'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, currentMonth, fmtDate, mondayOf, nextMondayISO, parseISO, toISO, weekDays,
} from '@/lib/dates';
import Grid from './Grid';
import MealPicker from './MealPicker';
import Fame from './Fame';
import { THEMES, applyTheme, readTheme } from '@/lib/theme';
import { MEAL_PRICE, isAdmin } from '@/lib/config';
import { downloadWeekXlsx } from '@/lib/excel';

const LS_KEY = 'rucak_user';
const todayISO = () => toISO(new Date());
const eur = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const sum = (lines) => lines.reduce((s, l) => s + l.qty * l.price, 0);
const count = (lines) => lines.reduce((s, l) => s + l.qty, 0);

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Greška na serveru');
  return data;
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const [startWeek, setStartWeek] = useState(null);

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const qu = qs.get('u');
      const qw = qs.get('w');
      if (qu) localStorage.setItem(LS_KEY, qu);
      if (qw && /^\d{4}-\d{2}-\d{2}$/.test(qw)) setStartWeek(qw);
      if (qu || qw) window.history.replaceState(null, '', window.location.pathname);
      const u = localStorage.getItem(LS_KEY);
      if (u) setUser(u);
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!user) {
    return (
      <Login
        onLogin={(u) => {
          try { localStorage.setItem(LS_KEY, u); } catch {}
          setUser(u);
        }}
      />
    );
  }
  return (
    <App
      user={user}
      startWeek={startWeek}
      onLogout={() => {
        try { localStorage.removeItem(LS_KEY); } catch {}
        setUser(null);
      }}
    />
  );
}


function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/users').then((d) => setUsers(d.users)).catch(() => {});
  }, []);

  async function submit(n) {
    const value = (n ?? name).trim();
    if (!value) return setErr('Unesi ime');
    setBusy(true);
    try {
      const d = await api('/api/users', { method: 'POST', body: JSON.stringify({ name: value }) });
      onLogin(d.name);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="card login-card">
        <div className="logo">🍽️</div>
        <h1>Ručak</h1>
        <p className="muted">Unesi ime da počneš. Zapamtiće te na ovom uređaju.</p>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            className="input"
            placeholder="npr. Peko"
            value={name}
            onChange={(e) => { setName(e.target.value); setErr(''); }}
            autoFocus
            maxLength={40}
          />
          {err && <p className="error">{err}</p>}
          <button className="btn primary full" disabled={busy}>Uđi</button>
        </form>
        {users.length > 0 && (
          <>
            <p className="muted small">Ili izaberi svoje ime:</p>
            <div className="chips">
              {users.map((u) => (
                <button key={u} className="chip" onClick={() => submit(u)} disabled={busy}>{u}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}


const TABS = [
  { id: 'week', label: 'Moja nedelja', icon: '📅' },
  { id: 'menu', label: 'Meni', icon: '📋' },
  { id: 'overview', label: 'Pregled', icon: '📊' },
  { id: 'fame', label: 'Slava', icon: '🏆' },
  { id: 'profile', label: 'Profil', icon: '👤' },
];

function App({ user, onLogout, startWeek }) {
  const [tab, setTab] = useState('week');
  const [menu, setMenu] = useState([]);
  const [week, setWeek] = useState(() => startWeek || toISO(mondayOf(new Date())));
  const [theme, setTheme] = useState('system');
  useEffect(() => setTheme(readTheme()), []);
  const changeTheme = (t) => { applyTheme(t); setTheme(t); };
  const themeIdx = Math.max(0, THEMES.findIndex((t) => t.id === theme));

  const loadMenu = useCallback(() => {
    api('/api/menu').then((d) => setMenu(d.items)).catch(() => {});
  }, []);
  useEffect(loadMenu, [loadMenu]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">🍽️ Ručak</div>
        <nav className="tabs-top">
          {TABS.map((t) => (
            <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="who">{user}</div>
        <button
          className="theme-btn"
          onClick={() => changeTheme(THEMES[(themeIdx + 1) % THEMES.length].id)}
          aria-label={`Tema: ${THEMES[themeIdx].label}`}
          title={`Tema: ${THEMES[themeIdx].label}`}
        >
          {THEMES[themeIdx].icon}
        </button>
      </header>

      <main className="content">
        {tab === 'week' && <WeekTab user={user} menu={menu} week={week} setWeek={setWeek} goMenu={() => setTab('menu')} />}
        {tab === 'menu' && <MenuTab menu={menu} reload={loadMenu} />}
        {tab === 'overview' && <OverviewTab week={week} setWeek={setWeek} />}
        {tab === 'fame' && <Fame />}
        {tab === 'profile' && <ProfileTab user={user} onLogout={onLogout} theme={theme} onTheme={changeTheme} />}
      </main>

      <nav className="tabs-bottom">
        {TABS.map((t) => (
          <button key={t.id} className={'btab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <span className="bicon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function WeekPicker({ week, setWeek }) {
  const days = weekDays(week);
  const next = nextMondayISO();
  const label =
    week === next ? 'Naredna nedelja' :
    week === toISO(addDays(parseISO(next), -7)) ? 'Ova nedelja' : 'Nedelja';
  return (
    <div className="weekpicker">
      <button className="btn icon" onClick={() => setWeek(toISO(addDays(parseISO(week), -7)))} aria-label="Prethodna">‹</button>
      <div className="weeklabel">
        <strong>{label}</strong>
        <span className="muted small">{fmtDate(days[0].date)} – {fmtDate(days[4].date)}</span>
      </div>
      <button className="btn icon" onClick={() => setWeek(toISO(addDays(parseISO(week), 7)))} aria-label="Sledeća">›</button>
    </div>
  );
}


function WeekTab({ user, menu, week, setWeek, goMenu }) {
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const timer = useRef();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setStatus('');
    api(`/api/orders?week=${week}`)
      .then((d) => { if (alive) setDays(d.orders[user]?.days || {}); })
      .catch(() => { if (alive) setStatus('Greška pri učitavanju'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [week, user]);

  function update(next) {
    setDays(next);
    setStatus('Čuvam…');
    clearTimeout(timer.current);
    const w = week;
    timer.current = setTimeout(async () => {
      try {
        await api('/api/orders', { method: 'PUT', body: JSON.stringify({ week: w, user, days: next }) });
        setStatus('Sačuvano ✓');
      } catch {
        setStatus('Greška pri čuvanju');
      }
    }, 400);
  }

  function setMeal(date, itemId) {
    const next = { ...days };
    if (!itemId) {
      delete next[date];
    } else {
      const item = menu.find((m) => m.id === itemId);
      if (!item) return;
      next[date] = [{ itemId: item.id, name: item.name, price: MEAL_PRICE, qty: 1 }];
    }
    update(next);
  }

  const [copying, setCopying] = useState(false);

  async function copyPrev() {
    const prevWeek = toISO(addDays(parseISO(week), -7));
    setCopying(true);
    try {
      const d = await api(`/api/orders?week=${prevWeek}`);
      const prev = d.orders[user]?.days || {};
      if (!Object.keys(prev).length) { setStatus('Prethodna nedelja je prazna'); return; }
      if (Object.keys(days).length && !confirm('Zamijeniti ovu nedelju porudžbinama iz prethodne?')) return;
      const next = {};
      for (const [date, lines] of Object.entries(prev)) {
        const l = lines[0];
        if (!l) continue;
        const m = menu.find((x) => x.id === l.itemId);
        next[toISO(addDays(parseISO(date), 7))] = [{ itemId: l.itemId, name: m ? m.name : l.name, price: MEAL_PRICE, qty: 1 }];
      }
      update(next);
    } catch {
      setStatus('Greška pri kopiranju');
    } finally {
      setCopying(false);
    }
  }

  const all = Object.values(days).flat();

  return (
    <section>
      <WeekPicker week={week} setWeek={setWeek} />

      <div className="summary card">
        <div><span className="muted small">Jela</span><strong>{count(all)}</strong></div>
        <div><span className="muted small">Ukupno</span><strong>{eur(sum(all))}</strong></div>
        <div className="status small">{status}</div>
      </div>

      <div className="actions">
        <button className="btn" onClick={copyPrev} disabled={copying || loading}>
          {copying ? 'Kopiram…' : '⧉ Kopiraj prethodnu nedelju'}
        </button>
      </div>

      {menu.length === 0 && (
        <div className="card empty">
          <p>Meni je prazan.</p>
          <button className="btn primary" onClick={goMenu}>Dodaj jela u meni</button>
        </div>
      )}

      {loading ? (
        <p className="muted center">Učitavam…</p>
      ) : (
        <div className="days">
          {weekDays(week).map((d) => {
            const line = days[d.date]?.[0];
            return (
              <div key={d.date} className={'card day' + (d.date === todayISO() ? ' today' : '')}>
                <div className="day-head">
                  <div>
                    <strong>{d.name}</strong> <span className="muted small">{fmtDate(d.date)}</span>
                    {d.date === todayISO() && <span className="today-badge">Danas</span>}
                  </div>
                  {line && <span className="pill">{eur(line.price)}</span>}
                </div>
                <MealPicker
                  value={line?.itemId || ''}
                  label={line?.name}
                  menu={menu}
                  onChange={(id) => setMeal(d.date, id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MenuTab({ menu, reload }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null);

  async function save(item) {
    setErr('');
    try {
      await api('/api/menu', { method: 'POST', body: JSON.stringify({ id: item.id, name: item.name }) });
      reload();
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    }
  }

  async function add(e) {
    e.preventDefault();
    if (await save({ name })) setName('');
  }

  async function remove(item) {
    if (!confirm(`Obrisati "${item.name}" iz menija? Stare porudžbine ostaju.`)) return;
    await api(`/api/menu?id=${item.id}`, { method: 'DELETE' }).catch(() => {});
    reload();
  }

  return (
    <section>
      <h2>Meni</h2>
      <p className="muted small">Svi vide i svi mogu da mijenjaju. Svaki obrok košta {eur(MEAL_PRICE)}, jedno jelo po danu.</p>

      <form className="card addform" onSubmit={add}>
        <input className="input" placeholder="Naziv jela" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <button className="btn primary">Dodaj</button>
      </form>
      {err && <p className="error">{err}</p>}

      <div className="card list">
        {menu.length === 0 && <p className="muted center">Još nema jela.</p>}
        {menu.map((m) =>
          editing?.id === m.id ? (
            <form
              key={m.id}
              className="row editrow"
              onSubmit={async (e) => { e.preventDefault(); if (await save(editing)) setEditing(null); }}
            >
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <button className="btn primary sm">Sačuvaj</button>
              <button type="button" className="btn sm" onClick={() => setEditing(null)}>Otkaži</button>
            </form>
          ) : (
            <div key={m.id} className="row">
              <span className="grow">{m.name}</span>
              <button className="btn sm" onClick={() => setEditing({ ...m })}>Izmijeni</button>
              <button className="btn sm danger" onClick={() => remove(m)} aria-label="Obriši">✕</button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function OverviewTab({ week, setWeek }) {
  const [orders, setOrders] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrders(null);
    api(`/api/orders?week=${week}`).then((d) => setOrders(d.orders)).catch(() => setOrders({}));
  }, [week]);

  useEffect(() => {
    setStats(null);
    api(`/api/stats?month=${month}`).then(setStats).catch(() => {});
  }, [month]);

  const byDay = useMemo(() => {
    if (!orders) return [];
    return weekDays(week).map((d) => {
      const items = {};
      for (const [name, o] of Object.entries(orders)) {
        for (const l of o.days?.[d.date] || []) {
          const it = (items[l.name] ??= { name: l.name, qty: 0, people: [] });
          it.qty += l.qty;
          it.people.push(l.qty > 1 ? `${name} x${l.qty}` : name);
        }
      }
      return { ...d, items: Object.values(items).sort((a, b) => b.qty - a.qty) };
    });
  }, [orders, week]);

  const perPerson = useMemo(() => {
    if (!orders) return [];
    return Object.entries(orders)
      .map(([name, o]) => {
        const lines = Object.values(o.days || {}).flat();
        return { name, meals: count(lines), total: sum(lines) };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  }, [orders]);

  const weekTotal = perPerson.reduce((s, p) => s + p.total, 0);

  function textForDelivery() {
    return byDay
      .filter((d) => d.items.length)
      .map((d) => `${d.name} ${fmtDate(d.date)}\n` + d.items.map((i) => `- ${i.name} x${i.qty}`).join('\n'))
      .join('\n\n');
  }

  async function copy() {
    const t = textForDelivery();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [exporting, setExporting] = useState(false);

  async function downloadExcel() {
    setExporting(true);
    try {
      await downloadWeekXlsx(week, orders);
    } finally {
      setExporting(false);
    }
  }

  const hasAny = byDay.some((d) => d.items.length);

  return (
    <section>
      <WeekPicker week={week} setWeek={setWeek} />

      <div className="actions">
        <button className="btn primary" onClick={copy} disabled={!hasAny}>{copied ? 'Kopirano ✓' : 'Kopiraj za dostavljača'}</button>
        <button className="btn" onClick={downloadExcel} disabled={!hasAny || exporting}>{exporting ? 'Pravim Excel…' : 'Preuzmi Excel'}</button>
      </div>

      {orders && <Grid week={week} orders={orders} />}

      {!orders ? (
        <p className="muted center">Učitavam…</p>
      ) : !hasAny ? (
        <div className="card empty"><p className="muted">Niko još nije poručio za ovu nedelju.</p></div>
      ) : (
        <div className="grid2">
          <div className="days">
            {byDay.map((d) => (
              <div key={d.date} className={'card day' + (d.date === todayISO() ? ' today' : '')}>
                <div className="day-head">
                  <div><strong>{d.name}</strong> <span className="muted small">{fmtDate(d.date)}</span>{d.date === todayISO() && <span className="today-badge">Danas</span>}</div>
                  {d.items.length > 0 && <span className="pill">{d.items.reduce((s, i) => s + i.qty, 0)} jela</span>}
                </div>
                {d.items.length === 0 && <p className="muted small">Ništa</p>}
                {d.items.map((i) => (
                  <div key={i.name} className="line">
                    <div className="line-name">
                      <span>{i.name} <strong>x{i.qty}</strong></span>
                      <span className="muted small">{i.people.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Ova nedelja po osobi</h3>
            <table className="table">
              <thead><tr><th>Ime</th><th>Jela</th><th>Iznos</th></tr></thead>
              <tbody>
                {perPerson.map((p) => (
                  <tr key={p.name}><td>{p.name}</td><td>{p.meals}</td><td>{eur(p.total)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td>Ukupno</td><td>{perPerson.reduce((s, p) => s + p.meals, 0)}</td><td>{eur(weekTotal)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="day-head">
          <h3>Mjesečni obračun</h3>
          <input type="month" className="input month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        {!stats ? (
          <p className="muted small">Učitavam…</p>
        ) : (
          <table className="table">
            <thead><tr><th>Ime</th><th>Jela</th><th>Iznos</th></tr></thead>
            <tbody>
              {stats.users.map((u) => (
                <tr key={u.name}><td>{u.name}</td><td>{u.meals}</td><td>{eur(u.total)}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Ukupno</td>
                <td>{stats.users.reduce((s, u) => s + u.meals, 0)}</td>
                <td>{eur(stats.users.reduce((s, u) => s + u.total, 0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
}


function ProfileTab({ user, onLogout, theme, onTheme }) {
  const [month, setMonth] = useState(currentMonth);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(null);
    api(`/api/stats?month=${month}`).then(setStats).catch(() => {});
  }, [month]);

  const me = stats?.users.find((u) => u.name === user) || { meals: 0, total: 0, weeks: {} };
  const weeks = Object.entries(me.weeks).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section>
      <div className="card profile-head">
        <div className="avatar">{user.slice(0, 1).toUpperCase()}</div>
        <div className="grow">
          <h2>{user}</h2>
          <input type="month" className="input month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
      </div>

      <div className="stats">
        <div className="card stat"><span className="muted small">Poručeno jela</span><strong>{stats ? me.meals : '…'}</strong></div>
        <div className="card stat"><span className="muted small">Potrošeno</span><strong>{stats ? eur(me.total) : '…'}</strong></div>
      </div>

      <div className="card">
        <h3>Po nedeljama</h3>
        {weeks.length === 0 ? (
          <p className="muted small">Nema porudžbina u ovom mjesecu.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Nedelja</th><th>Jela</th><th>Iznos</th></tr></thead>
            <tbody>
              {weeks.map(([w, s]) => (
                <tr key={w}><td>od {fmtDate(w)}</td><td>{s.meals}</td><td>{eur(s.total)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EmailCard user={user} />

      {isAdmin(user) && <UsersAdmin me={user} />}
      {isAdmin(user) && <SendReminder me={user} />}

      <div className="card">
        <h3>Tema</h3>
        <div className="seg">
          {THEMES.map((t) => (
            <button key={t.id} className={theme === t.id ? 'active' : ''} onClick={() => onTheme(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <button className="btn full" onClick={onLogout}>Promijeni korisnika</button>
    </section>
  );
}

function UsersAdmin({ me }) {
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState({});
  const [draft, setDraft] = useState({});
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(() => {
    api('/api/users').then((d) => setUsers(d.users)).catch(() => {});
    api('/api/email', { headers: { 'x-user': me } }).then((d) => { setEmails(d.emails); setDraft(d.emails); }).catch(() => {});
  }, [me]);

  async function saveEmail(u) {
    const value = (draft[u] || '').trim();
    if (value === (emails[u] || '')) return;
    setErr('');
    setOk('');
    try {
      const d = await api('/api/email', { method: 'PUT', body: JSON.stringify({ user: u, email: value }) });
      setEmails((e) => ({ ...e, [u]: d.email }));
      setDraft((e) => ({ ...e, [u]: d.email }));
      setOk(`Sačuvano za ${u} ✓`);
    } catch (e2) {
      setErr(`${u}: ${e2.message}`);
    }
  }
  useEffect(load, [load]);

  async function add(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return;
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function remove(u) {
    if (!confirm(`Obrisati korisnika "${u}" i sve njegove porudžbine?`)) return;
    setErr('');
    try {
      await api(`/api/users?name=${encodeURIComponent(u)}`, { method: 'DELETE', headers: { 'x-user': me } });
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="card">
      <h3>👑 Korisnici</h3>
      <p className="muted small">Vide samo admini (Peko i Tami). Email se čuva kad izađeš iz polja ili pritisneš Enter. Brisanje uklanja i sve porudžbine tog korisnika.</p>
      <form className="addform" onSubmit={add}>
        <input className="input" placeholder="Ime novog korisnika" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <button className="btn primary">Dodaj</button>
      </form>
      {err && <p className="error">{err}</p>}
      {ok && <p className="muted small" style={{ marginTop: 8 }}>{ok}</p>}
      <div className="list">
        {users.map((u) => (
          <div key={u} className="row admin-row">
            <span className="admin-name">{u}</span>
            <input
              className="input admin-email"
              type="email"
              inputMode="email"
              placeholder="email"
              value={draft[u] || ''}
              onChange={(e) => setDraft((d) => ({ ...d, [u]: e.target.value }))}
              onBlur={() => saveEmail(u)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            />
            {!isAdmin(u) && (
              <button className="btn sm danger" onClick={() => remove(u)} aria-label={`Obriši ${u}`}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailCard({ user }) {
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/email?user=${encodeURIComponent(user)}`).then((d) => { setEmail(d.email); setSaved(d.email); }).catch(() => {});
  }, [user]);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      const d = await api('/api/email', { method: 'PUT', body: JSON.stringify({ user, email }) });
      setEmail(d.email);
      setSaved(d.email);
      setMsg(d.email ? 'Sačuvano ✓ Podsjetnik stiže petkom ujutru.' : 'Podsjetnik isključen.');
    } catch (e2) {
      setMsg(e2.message);
    }
  }

  async function test() {
    setBusy(true);
    setMsg('');
    try {
      const d = await api('/api/cron/reminder?test=1', { headers: { 'x-user': user } });
      setMsg(d.sent?.length ? `Poslato na ${saved} ✓` : d.failed?.[0]?.error || d.note || 'Ništa nije poslato');
    } catch (e2) {
      setMsg(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>📧 Podsjetnik petkom</h3>
      <p className="muted small">Ako do petka ne popuniš narednu nedelju, stiže ti mejl. Ostavi prazno da ga isključiš.</p>
      <form className="addform" onSubmit={save}>
        <input className="input" type="email" inputMode="email" placeholder="tvoj@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn primary">Sačuvaj</button>
      </form>
      {isAdmin(user) && saved && (
        <button className="btn full" onClick={test} disabled={busy}>{busy ? 'Šaljem…' : 'Pošalji mi probni mejl'}</button>
      )}
      {msg && <p className="muted small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

function SendReminder({ me }) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('missing');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function send() {
    const who = mode === 'all' ? 'svima koji imaju email' : 'onima koji nisu popunili narednu nedelju';
    if (!confirm(`Poslati podsjetnik ${who}?`)) return;
    setBusy(true);
    setResult(null);
    try {
      const d = await api('/api/remind', { method: 'POST', headers: { 'x-user': me }, body: JSON.stringify({ message, mode }) });
      setResult(d);
      if (d.sent?.length) setMessage('');
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>📣 Pošalji podsjetnik</h3>
      <p className="muted small">Mejl ide odmah. Poruka se prikazuje na vrhu mejla, a možeš je i preskočiti.</p>
      <textarea
        className="input"
        rows={3}
        placeholder="npr. Ljudi, do ponedeljka u 9 da je sve popunjeno 🙏"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
        style={{ resize: 'vertical', marginBottom: 10 }}
      />
      <div className="seg" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 10 }}>
        <button className={mode === 'missing' ? 'active' : ''} onClick={() => setMode('missing')}>Nisu popunili</button>
        <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>Svima sa mejlom</button>
      </div>
      <button className="btn primary full" onClick={send} disabled={busy} style={{ marginTop: 0 }}>
        {busy ? 'Šaljem…' : 'Pošalji podsjetnik'}
      </button>
      {result && (
        <div className="small" style={{ marginTop: 10 }}>
          {result.error && <p className="error">{result.error}</p>}
          {result.sent?.length > 0 && <p>✅ Poslato: {result.sent.join(', ')}</p>}
          {result.failed?.length > 0 && <p className="error">❌ Nije prošlo: {result.failed.map((f) => `${f.name} (${f.error})`).join(', ')}</p>}
          {!result.error && !result.sent?.length && !result.failed?.length && <p className="muted">{result.note || 'Nema kome da se šalje.'}</p>}
        </div>
      )}
    </div>
  );
}
