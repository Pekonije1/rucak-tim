import { store } from '@/lib/db';
import { weekDays } from '@/lib/dates';
import { MEAL_PRICE } from '@/lib/config';

export const SEED_MENU = [
  'Bečka šnicla', 'Oslić bez glave 1kg', 'Burger', 'Ćevapi + pomfrit', 'Cezar salata', 'Čizburger',
  'Giros klasik', 'Giros mangiare', 'Grčka salata', 'Gurmanska pljeskavica', 'Njeguški stek',
  'Kiflice slane', 'Pica margarita', 'Klasik burger', 'Kuvano po dogovoru', 'Mangiare burger bez majoneza',
  'Omlet sa pilećom šunkom', 'Omlet šunka', 'Omlet kobasica', 'Omlet mangiare', 'Omlet hamburška slanina',
  'Pasta sa piletinom', 'Pica capricciosa', 'Pica diavolo', 'Pica sendvič', 'Pica tuna',
  'Pileća punjena pljeskavica', 'Pileći batak', 'Pileći ćevapi', 'Pileći rolovani ražnjići', 'Pileći popeci',
  'Pileći uštipci', 'Piletina u sosu sa pečurkama', 'Piroška', 'Pohovani pileći file', 'Pileći file',
  'Popek', 'Popek sendvič', 'Priganice sa kremom', 'Priganice sa sirom', 'Punjena pljeskavica',
  'Punjena vješalica', 'Punjeni batak', 'Hrskavi pileći štapići', 'Pileći tacos', 'Crispy chicken wrap',
  'Riža sa piletinom', 'Sendvič pršuta', 'Sendvič šunka', 'Sendvič piletina', 'Sendvič tuna',
  'Svinjski vrat', 'Giros hot', 'Slatke kifle', 'Slatke palačinke sa kremom', 'Tortilja sa hrskavom piletinom',
];

const SEED_WEEK = '2026-11-02';
const SEED_USERS = ['Tijana', 'Alina', 'Pop', 'Ogi', 'Vladan', 'Marko S.', 'Peko'];
const SEED_ORDERS = {
  'Pop': ['Čizburger', 'Pileći file', 'Bečka šnicla', 'Omlet sa pilećom šunkom', 'Omlet kobasica'],
  'Ogi': ['Čizburger', 'Pileći file', 'Bečka šnicla', 'Pileći file', 'Pileći file'],
  'Vladan': ['Crispy chicken wrap', 'Svinjski vrat', 'Čizburger', 'Pileći popeci', 'Cezar salata'],
  'Marko S.': ['Čizburger', 'Čizburger', 'Bečka šnicla', 'Bečka šnicla', 'Bečka šnicla'],
  'Peko': ['Čizburger', 'Njeguški stek', 'Pileći rolovani ražnjići', 'Njeguški stek', 'Popek'],
};

// Jednokratno punjenje baze početnim menijem, korisnicima i tekućom nedeljom
export async function seedOnce() {
  const flags = await store.smembers('flags');
  if (!flags.includes('seedV2') && (await store.sadd('flags', 'seedV2'))) {
    const emails = await store.hgetall('emails');
    if (!emails.Peko) await store.hset('emails', 'Peko', 'nikola.pekovic@medivrasolutions.com');
  }
  if (flags.includes('seedV1')) return;
  if (!(await store.sadd('flags', 'seedV1'))) return;

  const ids = {};
  for (const name of SEED_MENU) {
    const id = crypto.randomUUID();
    ids[name] = id;
    await store.hset('menu', id, { id, name, price: MEAL_PRICE });
  }
  for (const u of SEED_USERS) await store.sadd('users', u);

  const dates = weekDays(SEED_WEEK).map((d) => d.date);
  for (const [user, meals] of Object.entries(SEED_ORDERS)) {
    const days = {};
    meals.forEach((m, i) => {
      if (m) days[dates[i]] = [{ itemId: ids[m] || '', name: m, price: MEAL_PRICE, qty: 1 }];
    });
    await store.hset(`week:${SEED_WEEK}`, user, { days, updatedAt: new Date().toISOString() });
  }
}
