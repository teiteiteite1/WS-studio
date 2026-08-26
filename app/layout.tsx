import type { Metadata } from "next";
import Script from "next/script";
import MusicPlayerProvider from "./MusicPlayerProvider";
import "./globals.css";
import "./engagement.css";

const siteUrl = "https://ws-studio-wheat.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WS studio | Illustration, Film, Music & Character",
    template: "%s | WS studio",
  },
  description:
    "WS studioは、AIとの共作によるイラスト、映像、音楽、キャラクター制作を行う日本のクリエイティブスタジオです。",
  keywords: [
    "WS studio",
    "てい",
    "AI art",
    "AI creative",
    "illustration",
    "film",
    "music",
    "character",
    "Japan",
  ],
  authors: [{ name: "WS studio", url: siteUrl }],
  creator: "WS studio",
  publisher: "WS studio",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "WS studio",
    title: "WS studio | Illustration, Film, Music & Character",
    description:
      "AIとの共作によるイラスト、映像、音楽、キャラクター制作を行う日本のクリエイティブスタジオ。",
    images: [{ url: "/works/angel-green.jpg", alt: "WS studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WS studio | Illustration, Film, Music & Character",
    description:
      "AIとの共作によるイラスト、映像、音楽、キャラクター制作を行う日本のクリエイティブスタジオ。",
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
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "WS studio",
  url: siteUrl,
  foundingDate: "2025-06-04",
  description:
    "AIとの共作によるイラスト、映像、音楽、キャラクター制作を行う日本のクリエイティブスタジオ。",
  sameAs: [
    "https://x.com/WABISABI_pomo",
    "https://www.instagram.com/teiteite1tei",
    "https://suno.com/@teiteiteitei",
    "https://note.com/teiteiteite1",
    "https://wsstudiotei.base.shop/",
  ],
  founder: {
    "@type": "Person",
    name: "てい",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <MusicPlayerProvider>{children}</MusicPlayerProvider>
        <Script id="vercel-analytics-init" strategy="afterInteractive">
          {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
        </Script>
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
