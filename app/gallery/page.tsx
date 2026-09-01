import type { Metadata } from "next";
import GalleryGrid from "../GalleryGrid";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { galleryItems } from "../site-data";

export const metadata: Metadata = {
  title: "AIアート・AIイラスト Gallery | てい",
  description:
    "てい / WS studioのAIアート・AIイラスト作品ギャラリー。生成AIとの共作で制作したキャラクター、天使、幻想的なビジュアル作品を公開しています。",
  keywords: [
    "てい",
    "WS studio",
    "AIアート",
    "AIイラスト",
    "AI画像",
    "生成AI",
    "生成AIイラスト",
    "AI作品",
    "AIクリエイター",
  ],
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "AIアート・AIイラスト Gallery | てい / WS studio",
    description:
      "生成AIとの共作で制作した、てい / WS studioのAIアート・AIイラスト作品ギャラリー。",
    url: "/gallery",
    images: [
      {
        url: "/gallery/gallery-13.webp",
        alt: "てい / WS studioのAIアート・AIイラスト作品",
      },
    ],
  },
};

const galleryJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "てい / WS studio AIアート・AIイラスト Gallery",
  description: "生成AIとの共作で制作したAIアート・AIイラスト作品のギャラリー。",
  about: ["てい", "WS studio", "AIアート", "AIイラスト", "生成AI作品"],
  creator: {
    "@type": "Person",
    name: "てい",
  },
  hasPart: galleryItems.map((item) => ({
    "@type": "ImageObject",
    contentUrl: `https://ws-studio-wheat.vercel.app${item.src}`,
    caption: item.alt,
    creator: { "@type": "Person", name: "てい" },
    creditText: "WS studio",
  })),
};

export default function GalleryPage() {
  return (
    <main className="archive-page gallery-archive">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(galleryJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <header className="archive-heading">
        <h1>Gallery</h1>
        <p style={{ maxWidth: 720, color: "#74878d", fontSize: 12, lineHeight: 1.8, marginTop: 16 }}>
          生成AIとの共作で制作したAI画像・AIイラスト・AIアート作品を掲載しています。キャラクターや幻想的なビジュアルを中心としたWS studioの作品ギャラリーです。
        </p>
      </header>
      <section className="archive-content" aria-label="AI画像・AIイラスト・AIアート作品一覧">
        <GalleryGrid items={galleryItems} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
