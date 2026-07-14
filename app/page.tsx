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
          <div className="hero-title-row">
            <h1 id="hero-title"><Logo hero /></h1>
            <p className="hero-statement">
              当studioではAIと共作でイラスト、動画、音楽、キャラクターを作成しております。<br />
              依頼は随時受け付けておりますので、下記CONTACTフォームまたはXのDMにてご連絡ください。
            </p>
          </div>
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
        </div>
      </section>

      <section className="content-section gallery-section" id="gallery">
        <div className="section-title-row">
          <SectionTitle title="Gallery" />
          <Link className="section-link" href="/gallery">More →</Link>
        </div>
        <GalleryGrid items={galleryItems} randomize limit={6} />
      </section>

      <section className="content-section music-section" id="music">
        <div className="section-title-row">
          <SectionTitle title="Music" />
          <Link className="section-link" href="/music">More →</Link>
        </div>
        <MusicGrid tracks={musicTracks} randomize limit={6} />
      </section>

      <section className="content-section sns-section" id="sns">
        <SectionTitle title="SNS" />
        <div className="social-links">
          <a href="https://x.com/WABISABI_pomo" target="_blank" rel="noreferrer">
            <span>X</span><span>@WABISABI_pomo</span><i>↗</i>
          </a>
          <a href="https://www.instagram.com/teiteite1tei" target="_blank" rel="noreferrer">
            <span>Instagram</span><span>@teiteite1tei</span><i>↗</i>
          </a>
          <a href="https://suno.com/@teiteiteitei" target="_blank" rel="noreferrer">
            <span>SUNO</span><span>@teiteiteitei</span><i>↗</i>
          </a>
        </div>
      </section>

      <section className="content-section shop-section" id="shop">
        <SectionTitle title="Shop" />
        <div className="shop-panel">
          <p>Coming soon</p>
        </div>
      </section>

      <section className="content-section profile-section" id="profile">
        <SectionTitle title="Profile" />
        <div className="profile-grid">
          <article className="profile-card">
            <div className="profile-image">
              <Image src="/profile/tei.webp" alt="てい" fill sizes="(max-width: 640px) 100vw, 33vw" />
            </div>
            <h3>てい</h3>
            <p>2025.6にWS studioを設立。自称AI playerとしてイラスト、動画、楽曲生成を手掛ける。</p>
          </article>
          <article className="profile-card">
            <div className="profile-image">
              <Image src="/profile/shafuchan.webp" alt="社不ちゃん" fill sizes="(max-width: 640px) 100vw, 33vw" />
            </div>
            <h3>社不ちゃん</h3>
            <p>社会不適合で不器用だがどこか憎めない女の子。タバコと酒が好き。</p>
          </article>
          <article className="profile-card">
            <div className="profile-image">
              <Image src="/profile/ochillchan.webp" alt="おchillちゃん" fill sizes="(max-width: 640px) 100vw, 33vw" />
            </div>
            <h3>おchillちゃん</h3>
            <p>文字通りchillな曲を歌うAIシンガー。</p>
          </article>
        </div>
      </section>

      <section className="content-section news-section" id="news">
        <SectionTitle title="News" />
        <div className="news-list">
          <article><span className="news-date">Coming soon...</span><p>AI音楽コンピレーションアルバム「Now Generating」作成中</p></article>
          <article><time dateTime="2026-09-12">2026.9.12–13</time><p>Send AI Art Exhibitionにて展示、@仙台</p></article>
          <article>
            <time dateTime="2026-07-25">2026.7.25</time>
            <p><a href="https://tosu-designer.com/ai-fusion/" target="_blank" rel="noreferrer">AI FUSION FES</a>にて展示 @渋谷</p>
          </article>
          <article><time dateTime="2025-06-04">2025.6.4</time><p>WS studio設立</p></article>
        </div>
      </section>

      <section className="content-section contact-section" id="contact">
        <div className="contact-heading">
          <SectionTitle title="Contact" />
        </div>
        <ContactForm />
      </section>

      <SiteFooter />
    </main>
  );
}
