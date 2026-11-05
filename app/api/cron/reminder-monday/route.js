import { runReminders } from '@/lib/remind';

export const dynamic = 'force-dynamic';

// Vercel Cron ponedeljkom ujutro: podsjeti one koji nisu popunili TEKUĆU nedelju
export async function GET(req) {
  const isCron = !!process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) return Response.json({ error: 'Nije dozvoljeno' }, { status: 401 });
  const result = await runReminders({ mode: 'missing', when: 'this' });
  return Response.json(result, { status: result.error ? 500 : 200 });
}
