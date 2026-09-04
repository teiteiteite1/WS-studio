"use client";

const SUPABASE_URL = "https://udjpqsmihauksbceaxww.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";
const SESSION_KEY = "ws-personal-session-v1";

export type PersonalSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: { id: string; email?: string };
};

function saveSession(session: PersonalSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): PersonalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersonalSession) : null;
  } catch {
    return null;
  }
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.msg || payload?.error_description || payload?.message || "認証に失敗しました");
  return payload;
}

export async function signUp(email: string, password: string) {
  const payload = await authRequest("signup", { email, password });
  if (payload?.access_token) saveSession(payload as PersonalSession);
  return payload as PersonalSession & { identities?: unknown[] };
}

export async function signIn(email: string, password: string) {
  const payload = (await authRequest("token?grant_type=password", { email, password })) as PersonalSession;
  saveSession(payload);
  return payload;
}

export async function refreshSession(session: PersonalSession) {
  const payload = (await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token })) as PersonalSession;
  saveSession(payload);
  return payload;
}

export async function getValidSession() {
  const session = loadSession();
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt * 1000 > Date.now() + 60_000) return session;
  try {
    return await refreshSession(session);
  } catch {
    saveSession(null);
    return null;
  }
}

export function signOutLocal() { saveSession(null); }

async function rest<T>(path: string, session: PersonalSession, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "同期に失敗しました");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function getBriefReadIds(session: PersonalSession) {
  const rows = await rest<Array<{ item_id: string }>>("brief_read_state?select=item_id&order=read_at.desc", session);
  return rows.map((row) => row.item_id);
}

export async function saveBriefReadIds(session: PersonalSession, ids: string[]) {
  if (!ids.length) return;
  const rows = ids.map((item_id) => ({ user_id: session.user.id, item_id }));
  await rest("brief_read_state?on_conflict=user_id,item_id", session, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function getAI30Days(session: PersonalSession) {
  const rows = await rest<Array<{ day: number }>>("ai30_progress?select=day&order=day.asc", session);
  return rows.map((row) => row.day);
}

export async function saveAI30Days(session: PersonalSession, days: number[]) {
  if (!days.length) return;
  const rows = days.map((day) => ({ user_id: session.user.id, day }));
  await rest("ai30_progress?on_conflict=user_id,day", session, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function syncAI30Days(session: PersonalSession, days: number[]) {
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  const cloud = await getAI30Days(session);
  const removed = cloud.filter((day) => !unique.includes(day));
  await Promise.all(removed.map((day) => rest(`ai30_progress?day=eq.${day}`, session, { method: "DELETE" })));
  await saveAI30Days(session, unique);
}
