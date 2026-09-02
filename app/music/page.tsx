import type { Metadata } from "next";
import MusicGrid from "../MusicGrid";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { musicTracks } from "../site-data";

export const metadata: Metadata = {
  title: "AI音楽・生成AI Music",
  description:
    "てい / WS studioのAI音楽・生成AIを活用した楽曲作品。AIシンガーとの共作によるオリジナル音楽を試聴できます。",
  keywords: [
    "てい",
    "WS studio",
    "AI音楽",
    "生成AI音楽",
    "AI作曲",
    "AIシンガー",
    "AI楽曲",
    "生成AI",
  ],
  alternates: { canonical: "/music" },
  openGraph: {
    title: "AI音楽・生成AI Music | てい / WS studio",
    description: "AIシンガーとの共作による、てい / WS studioのAI音楽・オリジナル楽曲。",
    url: "/music",
  },
};

const musicJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "てい / WS studio AI音楽・生成AI Music",
  description: "生成AIやAIシンガーとの共作によるオリジナル音楽作品。",
  creator: { "@type": "Person", name: "てい" },
  hasPart: musicTracks.map((track) => ({
    "@type": "MusicRecording",
    name: track.title,
    url: track.spotifyUrl,
    byArtist: { "@type": "MusicGroup", name: "WS studio" },
  })),
};

export default function MusicPage() {
  return (
    <main className="archive-page music-archive">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(musicJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <header className="archive-heading">
        <h1>Music</h1>
        <a href="https://open.spotify.com/intl-ja/artist/5sZuyjE2PdlFgWLkJjpYPf" target="_blank" rel="noreferrer">
          Spotify ↗
        </a>
        <p style={{ maxWidth: 720, color: "#74878d", fontSize: 12, lineHeight: 1.8, marginTop: 16 }}>
          生成AIやAIシンガーとの共作によるAI音楽・オリジナル楽曲を公開しています。サイト内で試聴しながらWS studioの作品を閲覧できます。
        </p>
      </header>
      <section className="archive-content" aria-label="AI音楽・生成AI楽曲一覧">
        <MusicGrid tracks={musicTracks} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
