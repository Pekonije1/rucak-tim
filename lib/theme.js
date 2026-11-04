export const THEME_KEY = 'rucak_theme';
export const THEMES = [
  { id: 'system', label: 'Sistem', icon: '🖥️' },
  { id: 'light', label: 'Svijetla', icon: '☀️' },
  { id: 'dark', label: 'Tamna', icon: '🌙' },
];

// Pokreće se u <head> prije prikaza, da ne bljesne pogrešna tema
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(t) {
  const el = document.documentElement;
  if (t === 'light' || t === 'dark') el.dataset.theme = t;
  else delete el.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {}
}
