"use client";

import { trackEvent } from "./analytics-client";

type Brand = "x" | "instagram" | "threads" | "bluesky" | "pinterest" | "note" | "spotify" | "shop";

const links: Array<{ label: string; href: string; brand: Brand }> = [
  { label: "X", href: "https://x.com/WABISABI_pomo", brand: "x" },
  { label: "Instagram", href: "https://www.instagram.com/teiteite1tei", brand: "instagram" },
  { label: "Threads", href: "https://www.threads.com/@teiteite1tei", brand: "threads" },
  { label: "Bluesky", href: "https://bsky.app/profile/teiteiteite1.bsky.social", brand: "bluesky" },
  { label: "Pinterest", href: "https://www.pinterest.com/teiwsstudio/", brand: "pinterest" },
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

  if (brand === "threads") {
    // Brand glyph from Simple Icons (CC0), based on the official brand artwork.
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" /></svg>;
  }

  if (brand === "bluesky") {
    // Brand glyph from Simple Icons (CC0), based on the official brand artwork.
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026" /></svg>;
  }

  if (brand === "pinterest") {
    // Brand glyph from Simple Icons (CC0), based on the official brand artwork.
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" /></svg>;
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
        .hero-intro-row { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:20px; margin-top:28px; }
        .hero-intro-row .hero-intro { margin:0; }
        .hero-social-quick { display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
        .hero-social-quick a { width:36px; height:36px; display:grid; place-items:center; border:1px solid rgba(11,26,34,.12); border-radius:50%; background:rgba(248,250,249,.7); color:#526970; transition:transform 180ms ease, opacity 180ms ease, background 180ms ease, color 180ms ease; }
        .hero-social-quick a:hover { transform:translateY(-2px); color:#243c45; background:#fff; }
        .hero-social-quick svg { width:17px; height:17px; display:block; }
        .hero-social-quick .brand-note { width:18px; height:15px; }
        .journal-list { margin-top:72px; border-top:1px solid var(--line); }
        .journal-card { padding:clamp(28px,4vw,50px) 3px; border-bottom:1px solid var(--line); }
        .journal-card h3 { margin:0; }
        .journal-card h3 a { display:flex; align-items:baseline; justify-content:space-between; gap:24px; font-size:clamp(20px,2.3vw,30px); font-weight:450; letter-spacing:-.055em; line-height:1.12; transition:opacity 180ms ease; }
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
