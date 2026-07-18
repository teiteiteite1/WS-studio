import Image from "next/image";
import Link from "next/link";
import ContactForm from "./ContactForm";
import GalleryGrid from "./GalleryGrid";
import MusicGrid from "./MusicGrid";
import { Logo, SectionTitle, SiteFooter, SiteHeader } from "./SiteChrome";
import { galleryItems, musicTracks } from "./site-data";

type NoteArticle = { title: string; description: string; url: string };

function decodeXml(value: string) {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", lt: "<", quot: '"', nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

function rssTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() ?? "";
}

async function getLatestNoteArticles(): Promise<NoteArticle[]> {
  try {
    const response = await fetch("https://note.com/teiteiteite1/rss/", {
      next: { revalidate: 600 },
    });
    if (!response.ok) return [];

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    return items.slice(0, 3).flatMap((item) => {
      const title = decodeXml(rssTag(item, "title"));
      const url = decodeXml(rssTag(item, "link"));
      const description = decodeXml(
        rssTag(item, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
      ).replace(/続きをみる\s*$/u, "").trim();

      return title && url ? [{ title, description, url }] : [];
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  const noteArticles = await getLatestNoteArticles();

  return (
    <main>
      <SiteHeader />

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Creative studio / Japan</p>
          <div className="hero-title-row">
            <h1 id="hero-title"><Logo hero /></h1>
            <p className="hero-statement">
              <span>当studioではAIと共作でイラスト、動画、音楽、キャラクターを作成しております。</span>
              <span>依頼は随時受け付けておりますので、下記CONTACTフォームまたはXのDMにてご連絡ください。</span>
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
          <article><span className="news-date">Coming soon...</span><p>社不ちゃんに何やら動きがあるようだ</p></article>
          <article><span className="news-date">Coming soon...</span><p>AI音楽コンピレーションアルバム「Now Generating」作成中</p></article>
          <article><time dateTime="2026-09-12">2026.9.12–13</time><p>Send AI Art Exhibitionにて展示、@仙台</p></article>
          <article>
            <time dateTime="2026-07-25">2026.7.25</time>
            <p><a href="https://tosu-designer.com/ai-fusion/" target="_blank" rel="noreferrer">AI FUSION FES</a>にて展示 @渋谷</p>
          </article>
          <article><time dateTime="2025-06-04">2025.6.4</time><p>WS studio設立</p></article>
        </div>
      </section>

      <section className="content-section journal-section" id="journal">
        <style>{`
          .journal-list { margin-top: 72px; border-top: 1px solid var(--line); }
          .journal-card { padding: clamp(28px, 4vw, 50px) 3px; border-bottom: 1px solid var(--line); }
          .journal-card h3 { margin: 0; }
          .journal-card h3 a { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; font-size: clamp(26px, 3.4vw, 48px); font-weight: 450; letter-spacing: -.055em; line-height: 1.12; transition: opacity 180ms ease; }
          .journal-card h3 a:hover { opacity: .5; }
          .journal-card h3 span { flex: 0 0 auto; color: #809095; font-size: 13px; font-weight: 500; letter-spacing: 0; }
          .journal-card p { max-width: min(900px, 88vw); margin: 13px 0 0; overflow: hidden; color: #74878d; font-size: 12px; line-height: 1.7; text-overflow: ellipsis; white-space: nowrap; }
          @media (max-width: 640px) { .journal-list { margin-top: 52px; } }
        `}</style>
        <div className="section-title-row">
          <SectionTitle title="Journal" />
          <a
            className="section-link"
            href="https://note.com/teiteiteite1"
            target="_blank"
            rel="noreferrer"
          >
            More ↗
          </a>
        </div>
        {noteArticles.length > 0 ? (
          <div className="journal-list">
            {noteArticles.map((article) => (
              <article className="journal-card" key={article.url}>
                <h3>
                  <a href={article.url} target="_blank" rel="noreferrer">
                    {article.title}<span aria-hidden="true">↗</span>
                  </a>
                </h3>
                {article.description && <p>{article.description}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="journal-panel"><p>Coming soon.</p></div>
        )}
      </section>

      <section className="content-section contact-section" id="contact">
        <div className="contact-heading">
          <SectionTitle title="Contact" />
        </div>
        <ContactForm />
      </section>

      <section className="privacy-section" aria-labelledby="privacy-title">
        <div>
          <h2 id="privacy-title">Privacy Policy</h2>
          <p>WS studio（以下「当studio」）は、お問い合わせフォームを通じて取得した氏名、メールアドレスその他の情報を、お問い合わせへの回答および必要な連絡のためにのみ利用します。</p>
          <p>取得した個人情報は、法令に基づく場合または本人の同意がある場合を除き、第三者へ提供しません。また、個人情報の漏えい、紛失、改ざん等を防ぐため、適切な安全管理に努めます。</p>
          <p>当サイトからリンクする外部サイトにおける個人情報の取扱いについて、当studioは責任を負いません。本ポリシーは、必要に応じて予告なく変更する場合があります。</p>
          <p>個人情報に関するお問い合わせは、上記CONTACTフォームよりご連絡ください。</p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
