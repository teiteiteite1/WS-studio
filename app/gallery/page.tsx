import type { Metadata } from "next";
import GalleryGrid from "../GalleryGrid";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { galleryItems } from "../site-data";

export const metadata: Metadata = {
  title: "Gallery — WS studio",
  description: "Selected illustration works by WS studio.",
};

export default function GalleryPage() {
  return (
    <main className="archive-page gallery-archive">
      <SiteHeader />
      <header className="archive-heading">
        <h1>Gallery</h1>
      </header>
      <section className="archive-content" aria-label="All gallery works">
        <GalleryGrid items={galleryItems} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
