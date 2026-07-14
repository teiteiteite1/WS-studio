import Image from "next/image";

const works = [
  {
    src: "/works/angel-green.jpg",
    alt: "A winged girl in soft blue light",
    label: "Illustration 01",
    className: "work-card work-card--wide work-card--light",
  },
  {
    src: "/works/angel-apple.jpg",
    alt: "A winged girl holding a red apple",
    label: "Illustration 02",
    className: "work-card work-card--wide work-card--showcase",
  },
];

function Logo({ hero = false }: { hero?: boolean }) {
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

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <nav className="nav-shell" aria-label="Main navigation">
          <a className="brand-link" href="#top" aria-label="WS studio home">
            <Logo />
          </a>
          <div className="nav-links">
            <a href="#works">Works</a>
            <a href="#studio">Studio</a>
          </div>
        </nav>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Creative studio / Japan</p>
          <h1 id="hero-title">
            <Logo hero />
          </h1>
          <p className="hero-intro">Illustration&nbsp;&nbsp; Music&nbsp;&nbsp; Film&nbsp;&nbsp; Character</p>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <Image
            src="/works/angel-green.jpg"
            alt=""
            fill
            unoptimized
            priority
            sizes="(max-width: 760px) 100vw, 94vw"
          />
          <div className="hero-wash" />
          <span className="hero-index">WS — 001</span>
        </div>

        <a className="scroll-cue" href="#works" aria-label="View works">
          <span>Scroll to explore</span>
          <span className="scroll-line" />
        </a>
      </section>

      <section className="works-section" id="works" aria-labelledby="works-title">
        <div className="section-heading section-heading--minimal">
          <p className="eyebrow">Selected works / 2026</p>
          <h2 id="works-title">Works</h2>
        </div>

        <div className="works-grid">
          {works.map((work) => (
            <article className={work.className} key={work.src}>
              <Image
                src={work.src}
                alt={work.alt}
                fill
                unoptimized
                sizes="94vw"
              />
              <div className="work-overlay" />
              <div className="work-meta">
                <span>{work.label}</span>
                <span>WS studio</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-section" id="studio" aria-labelledby="studio-title">
        <div className="studio-symbol" aria-hidden="true">
          <span className="logo-mark logo-mark--display">
            <span>W</span>
            <span>S</span>
          </span>
        </div>
        <div className="studio-copy">
          <p className="eyebrow">Creative disciplines</p>
          <h2 id="studio-title">WS studio</h2>
          <ul className="disciplines" aria-label="Creative disciplines">
            <li>Illustration</li>
            <li>Music</li>
            <li>Film</li>
            <li>Character</li>
          </ul>
        </div>
      </section>

      <footer>
        <a className="brand-link" href="#top" aria-label="WS studio home">
          <Logo />
        </a>
        <p>© 2026 WS studio</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
