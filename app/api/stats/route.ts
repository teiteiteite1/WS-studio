import { NextResponse } from "next/server";

const SUPABASE_URL = "https://udjpqsmihauksbceaxww.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";

export async function GET() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ws_public_stats`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "stats_unavailable" }, { status: 502 });
    }

    const stats = await response.json();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "stats_unavailable" }, { status: 500 });
  }
}
