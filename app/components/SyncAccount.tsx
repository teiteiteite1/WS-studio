"use client";

import { useEffect, useState } from "react";
import { getValidSession, PersonalSession, signIn, signOutLocal, signUp } from "../lib/personalSync";

type Props = {
  onSessionChange?: (session: PersonalSession | null) => void;
};

export default function SyncAccount({ onSessionChange }: Props) {
  const [session, setSession] = useState<PersonalSession | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const current = await getValidSession();
      setSession(current);
      onSessionChange?.(current);
    })();
  }, [onSessionChange]);

  const submit = async () => {
    if (!email || password.length < 6) {
      setMessage("メールアドレスと6文字以上のパスワードを入力してください。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const created = await signUp(email, password);
        if (!created?.access_token) {
          setMessage("確認メールを送信しました。メールの確認後、ログインしてください。");
          setMode("login");
          return;
        }
        setSession(created);
        onSessionChange?.(created);
        setOpen(false);
      } else {
        const signed = await signIn(email, password);
        setSession(signed);
        onSessionChange?.(signed);
        setOpen(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "認証に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    signOutLocal();
    setSession(null);
    onSessionChange?.(null);
  };

  return (
    <div className="sync-account">
      {session ? (
        <div className="sync-account-row">
          <span className="sync-dot" />
          <span className="sync-label">SYNC ON</span>
          <button type="button" onClick={logout}>ログアウト</button>
        </div>
      ) : (
        <button type="button" className="sync-login-button" onClick={() => setOpen((v) => !v)}>SYNC OFF / ログイン</button>
      )}

      {open && !session && (
        <div className="sync-panel">
          <div className="sync-mode">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>ログイン</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>初回登録</button>
          </div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" autoComplete="email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (6文字以上)" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {message && <p>{message}</p>}
          <button type="button" className="sync-submit" onClick={() => void submit()} disabled={busy}>{busy ? "処理中" : mode === "login" ? "ログイン" : "登録"}</button>
          <small>同じアカウントでログインすると、iPhoneとMacの既読・学習進捗が同期されます。</small>
        </div>
      )}
    </div>
  );
}
