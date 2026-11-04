const norm = (s) => s.toLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[̀-ͯ]/g, '');

const CHICKEN = /pile|piletin|chicken|popek|batak|cezar/;
const BURGER = /burger/;
const PIZZA = /pica/;
const SWEET = /slatk|krem|palacink/;

// Srpska množina: 1 pile, 2-4 pileta, 5+ pilića
export function pl(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// Gruba procjena kalorija po jelu (zabava, ne nutricionizam)
export function kcal(name) {
  const n = norm(name);
  if (/salat/.test(n)) return 450;
  if (/omlet/.test(n)) return 500;
  if (/sendvic|wrap|tacos|tortilj|kiflic|piroska/.test(n)) return 600;
  if (SWEET.test(n)) return 700;
  if (/pljeskavic|stek|snicl|vjesalic|vrat|punjen/.test(n)) return 1000;
  if (/cevap|giros|pica/.test(n)) return 900;
  if (BURGER.test(n)) return 850;
  return 750;
}

const count = (meals, re) => meals.filter((m) => re.test(norm(m.name))).length;

export function computeFame(data) {
  const people = data.users.map((u) => {
    const meals = u.meals;
    const counts = {};
    meals.forEach((m) => (counts[m.name] = (counts[m.name] || 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const total = meals.reduce((s, m) => s + kcal(m.name), 0);
    return {
      name: u.name,
      meals: meals.length,
      chicken: count(meals, CHICKEN),
      burger: count(meals, BURGER),
      pizza: count(meals, PIZZA),
      sweet: count(meals, SWEET),
      distinct: Object.keys(counts).length,
      top: top ? { dish: top[0], n: top[1] } : null,
      kcal: total,
      avgKcal: meals.length ? total / meals.length : 0,
      coffee: data.activeDays.filter((d) => !meals.some((m) => m.date === d)).length,
    };
  });

  const titles = [
    {
      id: 'chicken', emoji: '🐔', title: 'Koljač piladi',
      desc: 'Kad on dođe, pilad bježe preko granice.',
      score: (p) => p.chicken,
      fmt: (v) => `${v} ${pl(v, 'pile', 'pileta', 'pilića')}`,
    },
    {
      id: 'robot', emoji: '🤖', title: 'Robot',
      desc: 'Našao je svoje jelo i ne pušta ga.',
      score: (p) => (p.top && p.top.n >= 2 ? p.top.n : 0),
      fmt: (v, p) => `${p.top.dish} ×${v}`,
    },
    {
      id: 'explorer', emoji: '🧭', title: 'Istraživač',
      desc: 'Probao je pola menija, ostalo planira za sledeći mjesec.',
      score: (p) => p.distinct,
      fmt: (v) => `${v} ${pl(v, 'različito jelo', 'različita jela', 'različitih jela')}`,
    },
    {
      id: 'coffee', emoji: '☕', title: 'Živi od kafe',
      desc: 'Fotosinteza i espresso. Ništa više.',
      score: (p) => p.coffee,
      fmt: (v) => `${v} ${pl(v, 'dan', 'dana', 'dana')} bez ručka`,
    },
    {
      id: 'heavy', emoji: '🥩', title: 'Teškaš',
      desc: 'Kalorije se ne broje, kalorije se osvajaju.',
      score: (p) => p.kcal,
      fmt: (v) => `~${Math.round(v / 100) / 10} k kcal`.replace('.', ','),
    },
    {
      id: 'fit', emoji: '🥗', title: 'Pazi na liniju',
      desc: 'Najlakši tanjir u kancelariji.',
      low: true,
      score: (p) => (p.meals >= 3 ? p.avgKcal : null),
      fmt: (v) => `~${Math.round(v)} kcal po obroku`,
    },
    {
      id: 'burger', emoji: '🍔', title: 'Burger baron',
      desc: 'Između dvije zemičke osjeća se kao kod kuće.',
      score: (p) => p.burger,
      fmt: (v) => `${v} ${pl(v, 'burger', 'burgera', 'burgera')}`,
    },
    {
      id: 'pizza', emoji: '🍕', title: 'Pizzaiolo',
      desc: 'Napulj bi bio ponosan.',
      score: (p) => p.pizza,
      fmt: (v) => `${v} ${pl(v, 'pica', 'pice', 'pica')}`,
    },
    {
      id: 'sweet', emoji: '🍰', title: 'Slatkoćin',
      desc: 'Ručak je samo izgovor za desert.',
      score: (p) => p.sweet,
      fmt: (v) => `${v} ${pl(v, 'slatkiš', 'slatkiša', 'slatkiša')}`,
    },
    {
      id: 'regular', emoji: '🏅', title: 'Stalni gost',
      desc: 'Dostavljač ga zna po imenu.',
      score: (p) => p.meals,
      fmt: (v) => `${v} ${pl(v, 'obrok', 'obroka', 'obroka')}`,
    },
  ];

  const awards = titles.map((t) => {
    const scored = people
      .map((p) => ({ p, v: t.score(p) }))
      .filter((x) => x.v != null && x.v > 0);
    if (!scored.length) return { ...t, winners: [] };
    const best = t.low ? Math.min(...scored.map((x) => x.v)) : Math.max(...scored.map((x) => x.v));
    const winners = scored
      .filter((x) => x.v === best)
      .map((x) => ({ name: x.p.name, label: t.fmt(x.v, x.p) }));
    return { ...t, winners };
  });

  return { awards, people };
}
