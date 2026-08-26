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
          <span aria-hidden="true">{link.icon}</span>
        </a>
      ))}
    </nav>
  );
}
