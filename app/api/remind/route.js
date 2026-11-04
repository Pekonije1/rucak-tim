import { getSession } from '@/lib/auth';
import { runReminders } from '@/lib/remind';

export const dynamic = 'force-dynamic';

// Admin ručno šalje podsjetnik sa porukom
export async function POST(req) {
  const s = await getSession(req);
  const requester = s?.name;
  if (!s?.admin) return Response.json({ error: 'Samo admin može da šalje podsjetnike' }, { status: 403 });
  const { message, mode } = await req.json();
  const result = await runReminders({
    mode: mode === 'all' ? 'all' : 'missing',
    requester,
    message: String(message || '').trim(),
  });
  return Response.json(result, { status: result.error ? 500 : 200 });
}
