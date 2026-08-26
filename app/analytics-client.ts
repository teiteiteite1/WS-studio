const SUPABASE_URL = "https://udjpqsmihauksbceaxww.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";

function getVisitorId() {
  const key = "ws_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function trackEvent(eventName: string, eventValue?: string) {
  if (typeof window === "undefined") return;
  const visitorId = getVisitorId();
  fetch(`${SUPABASE_URL}/rest/v1/rpc/ws_record_event`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_visitor_id: visitorId,
      p_event_name: eventName,
      p_event_value: eventValue ?? null,
      p_path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => {});
}
