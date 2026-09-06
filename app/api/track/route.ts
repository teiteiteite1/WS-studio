import { SUPABASE_KEY, SUPABASE_URL } from '../../lib/insights-config';
import { cleanActivity } from '../../lib/telemetry';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(null,{status:403});
  if (/bot|crawler|spider|headless/i.test(request.headers.get('user-agent') || '')) return new Response(null,{status:204});
  try {
    if (Number(request.headers.get('content-length')) > 8192) return new Response(null,{status:413});
    const body = await request.text();
    if (body.length > 8192) return new Response(null,{status:413});
    const activity = cleanActivity(JSON.parse(body));
    if (!activity) return new Response(null,{status:400});
    const r = await fetch(SUPABASE_URL+'/rest/v1/ws_activity',{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(activity),signal:AbortSignal.timeout(8000)});
    if (r.ok || (r.status === 409 && (await r.json()).code === '23505')) return new Response(null,{status:204});
    return new Response(null,{status:503});
  } catch { return new Response(null,{status:503}); }
}
