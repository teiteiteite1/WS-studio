"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SUPABASE_URL = "https://udjpqsmihauksbceaxww.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";

function visitorId() {
  const key = "ws_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const id = visitorId();
    fetch(`${SUPABASE_URL}/rest/v1/rpc/ws_record_visit`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_visitor_id: id,
        p_path: pathname || "/",
        p_referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
