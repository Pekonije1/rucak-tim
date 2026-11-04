# Ručak

Nedeljne porudžbine hrane za tim. Svako unese ime, izabere jedno jelo po danu, a aplikacija računa ko je koliko jeo i potrošio.

Live: https://rucak-tim.vercel.app

## Stack
- Next.js (App Router, JavaScript)
- Upstash Redis (preko Vercel Storage)
- Deploy na Vercel

## Lokalno
```
npm install
npm run dev
```
Bez env varijabli aplikacija koristi memoriju (podaci se brišu na restart). Za pravu bazu postavi `KV_REST_API_URL` i `KV_REST_API_TOKEN`.

## Bitni fajlovi
- `lib/config.js` cijena obroka (trenutno fiksno 2,50 €)
- `lib/seed.js` početni meni, korisnici i prva nedelja
- `app/page.js` cijeli UI
- `app/Grid.js` tabela nedelje (osobe × dani)
- `app/api/*` API rute
