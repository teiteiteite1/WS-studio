import type { Metadata } from "next";
import MusicGrid from "../MusicGrid";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { musicTracks } from "../site-data";

export const metadata: Metadata = {
  title: "Music — WS studio",
  description: "Music by WS studio.",
};

export default function MusicPage() {
  return (
    <main className="archive-page music-archive">
      <SiteHeader />
      <header className="archive-heading">
        <p>02 / Discography</p>
        <h1>Music</h1>
        <a
          href="https://open.spotify.com/intl-ja/artist/5sZuyjE2PdlFgWLkJjpYPf"
          target="_blank"
          rel="noreferrer"
        >
          Spotify ↗
        </a>
      </header>
      <section className="archive-content" aria-label="All music releases">
        <MusicGrid tracks={musicTracks} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
