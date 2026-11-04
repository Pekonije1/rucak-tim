import { isAdmin } from '@/lib/config';
import { runReminders } from '@/lib/remind';

export const dynamic = 'force-dynamic';

// Vercel Cron petkom: podsjeti sve koji imaju email, a nisu popunili narednu nedelju.
// ?test=1 sa x-user: <admin> šalje probni mejl samo tom adminu.
export async function GET(req) {
  const test = new URL(req.url).searchParams.get('test') === '1';
  const tester = req.headers.get('x-user');
  const isCron = !!process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const isAdminTest = test && isAdmin(tester);
  if (!isCron && !isAdminTest) return Response.json({ error: 'Nije dozvoljeno' }, { status: 401 });

  const result = await runReminders(isAdminTest ? { mode: 'self', requester: tester } : { mode: 'missing' });
  return Response.json(result, { status: result.error ? 500 : 200 });
}
