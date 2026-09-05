import { SUPABASE_KEY, SUPABASE_URL } from '../../lib/insights-config';
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const headers = {'Cache-Control':'no-store, max-age=0'};
  if (!authorization?.startsWith('Bearer ')) return Response.json({error:'ログインしてください。'}, {status:401,headers});
  const p = new URL(request.url).searchParams;
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/rpc/ws_insights_dashboard', { method:'POST', headers:{apikey:SUPABASE_KEY,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({p_start:p.get('start'),p_end:p.get('end'),p_site:p.get('site') || 'official'}),cache:'no-store',signal:AbortSignal.timeout(15000) });
    if (!r.ok) return Response.json({error: r.status === 401 ? 'ログインし直してください。' : r.status === 403 ? 'このアカウントではインサイトを閲覧できません。' : '集計を取得できません。期間を確認して再読み込みしてください。'}, {status:[401,403].includes(r.status)?r.status:502,headers});
    return Response.json(await r.json(),{headers});
  } catch { return Response.json({error:'集計への接続に失敗しました。再読み込みしてください。'},{status:503,headers}); }
}
