"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SyncAccount from "../components/SyncAccount";
import { getAI30Days, PersonalSession, saveAI30Days, syncAI30Days } from "../lib/personalSync";

const STORAGE_KEY = "ws-ai30-progress-v1";

function readDays(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeDays(days: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(days)).sort((a, b) => a - b)));
}

export default function LearnSyncBridge() {
  const [session, setSession] = useState<PersonalSession | null>(null);
  const [status, setStatus] = useState("");
  const previous = useRef("");

  const handleSession = useCallback(async (next: PersonalSession | null) => {
    setSession(next);
    if (!next) return;
    setStatus("SYNCING…");
    try {
      const local = readDays();
      const cloud = await getAI30Days(next);
      const merged = Array.from(new Set([...local, ...cloud])).sort((a, b) => a - b);
      const changedLocally = JSON.stringify(local) !== JSON.stringify(merged);
      writeDays(merged);
      previous.current = JSON.stringify(merged);
      await saveAI30Days(next, merged);
      setStatus("SYNCED");
      if (changedLocally) window.location.reload();
    } catch {
      setStatus("SYNC ERROR");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    previous.current = JSON.stringify(readDays());
    const timer = window.setInterval(() => {
      const days = readDays();
      const now = JSON.stringify(days);
      if (now === previous.current) return;
      previous.current = now;
      void syncAI30Days(session, days).then(() => setStatus("SYNCED")).catch(() => setStatus("SYNC ERROR"));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [session]);

  return (
    <div className="learn-sync-wrap">
      <SyncAccount onSessionChange={handleSession} />
      {status && <span className="learn-sync-status">{status}</span>}
    </div>
  );
}
