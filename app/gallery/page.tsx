import type { Metadata } from "next";
import GalleryGrid from "../GalleryGrid";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { galleryItems } from "../site-data";

export const metadata: Metadata = {
  title: "AI画像・AIイラスト・AIアート Gallery",
  description: "WS studioのAI画像・AIイラスト・AIアート作品ギャラリー。生成AIとの共作で制作したキャラクター、天使、幻想的なビジュアル作品を公開しています。",
  keywords: ["AI画像", "AIイラスト", "AIアート", "生成AI", "生成AIイラスト", "AI作品", "AIクリエイター"],
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "AI画像・AIイラスト・AIアート Gallery | WS studio",
    description: "生成AIとの共作で制作したWS studioのAI画像・AIイラスト・AIアート作品ギャラリー。",
    url: "/gallery",
    images: [{ url: "/gallery/gallery-13.webp", alt: "WS studio AI画像・AIイラスト作品" }],
  },
};

const galleryJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "WS studio AI画像・AIイラスト・AIアート Gallery",
  description: "生成AIとの共作で制作したAI画像・AIイラスト・AIアート作品のギャラリー。",
  about: ["AI画像", "AIイラスト", "AIアート", "生成AI作品"],
  hasPart: galleryItems.map((item) => ({
    "@type": "ImageObject",
    contentUrl: `https://ws-studio-wheat.vercel.app${item.src}`,
    caption: item.alt,
    creator: { "@type": "Organization", name: "WS studio" },
  })),
};

export default function GalleryPage() {
  return (
    <main className="archive-page gallery-archive">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <header className="archive-heading">
        <h1>Gallery</h1>
        <p style={{maxWidth:720,color:"#74878d",fontSize:12,lineHeight:1.8,marginTop:16}}>生成AIとの共作で制作したAI画像・AIイラスト・AIアート作品を掲載しています。キャラクターや幻想的なビジュアルを中心としたWS studioの作品ギャラリーです。</p>
      </header>
      <section className="archive-content" aria-label="AI画像・AIイラスト・AIアート作品一覧">
        <GalleryGrid items={galleryItems} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
