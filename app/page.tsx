import Image from "next/image";
import Link from "next/link";
import ContactForm from "./ContactForm";
import GalleryGrid from "./GalleryGrid";
import MusicGrid from "./MusicGrid";
import { Logo, SectionTitle, SiteFooter, SiteHeader } from "./SiteChrome";
import { galleryItems, musicTracks } from "./site-data";

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Creative studio / Japan</p>
          <h1 id="hero-title"><Logo hero /></h1>
          <p className="hero-intro">Illustration&nbsp;&nbsp; Music&nbsp;&nbsp; Film&nbsp;&nbsp; Character</p>
        </div>
        <div className="hero-visual">
          <Image
            src="/works/angel-green.jpg"
            alt="A winged girl in soft blue light"
            fill
            unoptimized
            priority
            sizes="(max-width: 760px) 100vw, 94vw"
          />
          <div className="hero-wash" />
          <span className="hero-index">WS — 001</span>
        </div>
      </section>

      <section className="content-section gallery-section" id="gallery">
        <div className="section-title-row">
          <SectionTitle index="01" title="Gallery" />
          <Link className="section-link" href="/gallery">More →</Link>
        </div>
        <GalleryGrid items={galleryItems.slice(0, 6)} />
      </section>

      <section className="content-section music-section" id="music">
        <div className="section-title-row">
          <SectionTitle index="02" title="Music" />
          <Link className="section-link" href="/music">More →</Link>
        </div>
        <MusicGrid tracks={musicTracks.slice(0, 6)} />
      </section>

      <section className="content-section sns-section" id="sns">
        <SectionTitle index="03" title="SNS" />
        <div className="social-links">
          <a href="https://x.com/WABISABI_pomo" target="_blank" rel="noreferrer">
            <span>X</span><span>@WABISABI_pomo</span><i>↗</i>
          </a>
          <a href="https://www.instagram.com/teiteite1tei" target="_blank" rel="noreferrer">
            <span>Instagram</span><span>@teiteite1tei</span><i>↗</i>
          </a>
        </div>
      </section>

      <section className="content-section quiet-section" id="profile">
        <SectionTitle index="04" title="Profile" />
        <div className="quiet-panel">
          <span>WS</span>
          <p>Coming soon</p>
        </div>
      </section>

      <section className="content-section news-section" id="news">
        <SectionTitle index="05" title="News" />
        <div className="news-list">
          <div><time>—</time><p>Coming soon</p><span>↗</span></div>
        </div>
      </section>

      <section className="content-section contact-section" id="contact">
        <div className="contact-heading">
          <SectionTitle index="06" title="Contact" />
          <a href="mailto:tei.wsstudio@gmail.com">tei.wsstudio@gmail.com</a>
        </div>
        <ContactForm />
      </section>

      <SiteFooter />
    </main>
  );
}
