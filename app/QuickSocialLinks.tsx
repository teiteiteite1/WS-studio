"use client";

import { trackEvent } from "./analytics-client";

const links = [
  { label: "X", href: "https://x.com/WABISABI_pomo", icon: "X" },
  { label: "Instagram", href: "https://www.instagram.com/teiteite1tei", icon: "◎" },
  { label: "note", href: "https://note.com/teiteiteite1", icon: "n" },
  { label: "Shop", href: "https://wsstudiotei.base.shop/", icon: "▢" },
] as const;

export default function QuickSocialLinks() {
  return (
    <>
      <style>{`
        .hero-intro-row { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-top:28px; }
        .hero-intro-row .hero-intro { margin:0; }
        .hero-social-quick { display:flex; align-items:center; gap:9px; }
        .hero-social-quick a { width:34px; height:34px; display:grid; place-items:center; border:1px solid rgba(11,26,34,.12); border-radius:50%; background:rgba(248,250,249,.7); color:#526970; font-size:13px; font-weight:650; line-height:1; transition:transform 180ms ease, opacity 180ms ease, background 180ms ease; }
        .hero-social-quick a:hover { transform:translateY(-2px); opacity:.62; background:#fff; }
        .journal-list { margin-top:72px; border-top:1px solid var(--line); }
        .journal-card { padding:clamp(28px,4vw,50px) 3px; border-bottom:1px solid var(--line); }
        .journal-card h3 { margin:0; }
        .journal-card h3 a { display:flex; align-items:baseline; justify-content:space-between; gap:24px; font-size:clamp(26px,3.4vw,48px); font-weight:450; letter-spacing:-.055em; line-height:1.12; transition:opacity 180ms ease; }
        .journal-card h3 a:hover { opacity:.5; }
        .journal-card h3 span { flex:0 0 auto; color:#809095; font-size:13px; font-weight:500; letter-spacing:0; }
        .journal-card p { max-width:min(900px,88vw); margin:13px 0 0; overflow:hidden; color:#74878d; font-size:12px; line-height:1.7; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width:640px) { .hero-intro-row { align-items:flex-start; flex-direction:column; } .journal-list { margin-top:52px; } }
      `}</style>
      <nav className="hero-social-quick" aria-label="Quick links">
        {links.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} title={link.label} onClick={() => trackEvent("social_click", link.label)}>
            <span aria-hidden="true">{link.icon}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
