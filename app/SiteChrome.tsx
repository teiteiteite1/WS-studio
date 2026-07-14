import Link from "next/link";
import { navigation } from "./site-data";

export function Logo({ hero = false }: { hero?: boolean }) {
  return (
    <span className={hero ? "logo logo--hero" : "logo"} role="img" aria-label="WS studio">
      <span className="logo-mark" aria-hidden="true">
        <span>W</span>
        <span>S</span>
      </span>
      <span aria-hidden="true">studio</span>
    </span>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link className="brand-link" href="/#top" aria-label="WS studio home">
          <Logo />
        </Link>
        <div className="nav-links">
          {navigation.map(([label, href]) => (
            <Link href={href} key={href}>{label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Link className="brand-link" href="/#top" aria-label="WS studio home"><Logo /></Link>
      <p>© 2026 WS studio</p>
      <Link href="/#top">Back to top ↑</Link>
    </footer>
  );
}
