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
    default: "WS studio / てい | AIアート・映像・音楽・キャラクター制作",
    template: "%s | WS studio / てい",
  },
  description:
    "WS studioは、ていが主宰する日本のクリエイティブスタジオ。生成AIとの共作によるAIアート・AIイラスト、映像、AI音楽、キャラクター作品を制作・発表しています。作品、音楽、活動情報、制作・コラボレーションの窓口を掲載しています。",
  keywords: [
    "WS studio",
    "てい",
    "AIクリエイター",
    "AI player",
    "生成AI",
    "AIアート",
    "AIイラスト",
    "AI画像",
    "AI映像",
    "AI動画",
    "AI音楽",
    "キャラクター制作",
  ],
  authors: [{ name: "てい / WS studio", url: siteUrl }],
  creator: "てい / WS studio",
  publisher: "WS studio",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "WS studio",
    title: "WS studio / てい | AIアート・映像・音楽・キャラクター制作",
    description:
      "ていが主宰するWS studio。生成AIとの共作によるAIアート、映像、AI音楽、キャラクター作品を制作・発表しています。",
    images: [
      {
        url: "/works/angel-green.jpg",
        alt: "WS studio / ていのAIアート作品",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WS studio / てい | AIアート・映像・音楽・キャラクター制作",
    description:
      "生成AIとの共作によるAIアート、映像、AI音楽、キャラクター作品を制作・発表するWS studio。",
    images: ["/works/angel-green.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "WS studio",
      alternateName: ["WS studio / てい", "WS studio by TEI"],
      url: siteUrl,
      foundingDate: "2025-06-04",
      description:
        "ていが主宰し、生成AIとの共作によるAIアート、映像、AI音楽、キャラクター作品を制作する日本のクリエイティブスタジオ。",
      knowsAbout: [
        "AIアート",
        "AIイラスト",
        "生成AI",
        "AI映像",
        "AI動画",
        "AI音楽",
        "キャラクター制作",
      ],
      sameAs: [
        "https://x.com/WABISABI_pomo",
        "https://www.instagram.com/teiteite1tei",
        "https://open.spotify.com/intl-ja/artist/5sZuyjE2PdlFgWLkJjpYPf",
        "https://suno.com/@teiteiteitei",
        "https://note.com/teiteiteite1",
        "https://wsstudiotei.base.shop/",
      ],
      founder: { "@id": `${siteUrl}/#tei` },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#tei`,
      name: "てい",
      alternateName: "TEI",
      url: `${siteUrl}/#profile`,
      jobTitle: "AI player / Creator",
      worksFor: { "@id": `${siteUrl}/#organization` },
      knowsAbout: ["AIアート", "AI映像", "AI音楽", "生成AI", "キャラクター制作"],
      sameAs: [
        "https://x.com/WABISABI_pomo",
        "https://www.instagram.com/teiteite1tei",
        "https://note.com/teiteiteite1",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "WS studio",
      alternateName: "WS studio / てい",
      url: siteUrl,
      inLanguage: "ja",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <VisitTracker />
        <MusicPlayerProvider>{children}</MusicPlayerProvider>
        <Script id="vercel-analytics-init" strategy="afterInteractive">{`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}</Script>
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
