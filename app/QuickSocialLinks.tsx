"use client";

import { trackEvent } from "./analytics-client";

type Brand = "x" | "instagram" | "note" | "spotify" | "shop";

const links: Array<{ label: string; href: string; brand: Brand }> = [
  { label: "X", href: "https://x.com/WABISABI_pomo", brand: "x" },
  { label: "Instagram", href: "https://www.instagram.com/teiteite1tei", brand: "instagram" },
  { label: "note", href: "https://note.com/teiteiteite1", brand: "note" },
  { label: "Spotify", href: "https://open.spotify.com/search/WS%20studio", brand: "spotify" },
  { label: "Shop", href: "https://wsstudiotei.base.shop/", brand: "shop" },
];

function BrandIcon({ brand }: { brand: Brand }) {
  if (brand === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    );
  }

  if (brand === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.15" y="3.15" width="17.7" height="17.7" rx="5.1" fill="none" stroke="currentColor" strokeWidth="2.1" />
        <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2.1" />
        <circle cx="17.45" cy="6.75" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (brand === "spotify") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M7.1 9.15c3.72-1.08 8.2-.72 11.13.82" fill="none" stroke="#f8faf9" strokeWidth="1.55" strokeLinecap="round" />
        <path d="M7.85 12.25c3.13-.86 6.93-.57 9.56.75" fill="none" stroke="#f8faf9" strokeWidth="1.45" strokeLinecap="round" />
        <path d="M8.55 15.17c2.63-.63 5.54-.42 7.83.69" fill="none" stroke="#f8faf9" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    );
  }

  if (brand === "note") {
    return (
      <svg viewBox="0 0 28 24" aria-hidden="true" className="brand-note">
        <path fill="currentColor" d="M5 5.2c0-1.2.8-2 2-2h4.1c1.05 0 1.7.42 2.27 1.3l4.38 6.75V5.2c0-1.2.8-2 2-2h1.25c1.2 0 2 .8 2 2v13.6c0 1.2-.8 2-2 2h-3.72c-1.05 0-1.7-.42-2.27-1.3l-4.76-7.28v6.58c0 1.2-.8 2-2 2H7c-1.2 0-2-.8-2-2V5.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8.2h14l-1.15 11H6.15L5 8.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.4 8.2V6.4a3.6 3.6 0 0 1 7.2 0v1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function QuickSocialLinks() {
  return (
    <>
      <style>{`
        .hero-intro-row { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-top:28px; }
        .hero-intro-row .hero-intro { margin:0; }
        .hero-social-quick { display:flex; align-items:center; gap:9px; }
        .hero-social-quick a { width:36px; height:36px; display:grid; place-items:center; border:1px solid rgba(11,26,34,.12); border-radius:50%; background:rgba(248,250,249,.7); color:#526970; transition:transform 180ms ease, opacity 180ms ease, background 180ms ease, color 180ms ease; }
        .hero-social-quick a:hover { transform:translateY(-2px); color:#243c45; background:#fff; }
        .hero-social-quick svg { width:17px; height:17px; display:block; }
        .hero-social-quick .brand-note { width:18px; height:15px; }
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
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
            onClick={() => trackEvent("social_click", link.label)}
          >
            <BrandIcon brand={link.brand} />
          </a>
        ))}
      </nav>
    </>
  );
}
