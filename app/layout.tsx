import type { Metadata } from "next";
import Script from "next/script";
import MusicPlayerProvider from "./MusicPlayerProvider";
import VisitTracker from "./VisitTracker";
import "./globals.css";
import "./engagement.css";

const siteUrl = "https://ws-studio-wheat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WS studio | AI画像・AIイラスト・AIアート・AI音楽",
    template: "%s | WS studio",
  },
  description:
    "WS studioは、生成AIとの共作によるAI画像・AIイラスト・AIアート、映像、AI音楽、キャラクター作品を制作する日本のクリエイティブスタジオです。作品ギャラリーや音楽を公開しています。",
  keywords: ["AI画像", "AIイラスト", "AIアート", "生成AI", "生成AI作品", "AIクリエイター", "AI動画", "AI音楽", "WS studio", "てい"],
  authors: [{ name: "WS studio", url: siteUrl }],
  creator: "WS studio",
  publisher: "WS studio",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "ja_JP", url: siteUrl, siteName: "WS studio",
    title: "WS studio | AI画像・AIイラスト・AIアート・AI音楽",
    description: "生成AIとの共作によるAI画像・AIイラスト・AIアート、映像、AI音楽、キャラクター作品を制作・公開するWS studio。",
    images: [{ url: "/works/angel-green.jpg", alt: "WS studioのAIイラスト・AIアート作品" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WS studio | AI画像・AIイラスト・AIアート・AI音楽",
    description: "生成AIとの共作によるAI画像・AIイラスト・AIアート、映像、AI音楽、キャラクター作品を公開。",
    images: ["/works/angel-green.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

const organizationJsonLd = {
  "@context": "https://schema.org", "@type": "Organization", name: "WS studio", url: siteUrl,
  foundingDate: "2025-06-04",
  description: "生成AIとの共作によるAI画像・AIイラスト・AIアート、映像、AI音楽、キャラクター作品を制作する日本のクリエイティブスタジオ。",
  knowsAbout: ["AI画像", "AIイラスト", "AIアート", "生成AI", "AI動画", "AI音楽", "キャラクター制作"],
  sameAs: ["https://x.com/WABISABI_pomo", "https://www.instagram.com/teiteite1tei", "https://open.spotify.com/intl-ja/artist/5sZuyjE2PdlFgWLkJjpYPf", "https://suno.com/@teiteiteitei", "https://note.com/teiteiteite1", "https://wsstudiotei.base.shop/"],
  founder: { "@type": "Person", name: "てい" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
        <VisitTracker />
        <MusicPlayerProvider>{children}</MusicPlayerProvider>
        <Script id="vercel-analytics-init" strategy="afterInteractive">{`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}</Script>
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
