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
        <p>01 / Selected works</p>
        <h1>Gallery</h1>
        <span>{String(galleryItems.length).padStart(2, "0")} works</span>
      </header>
      <section className="archive-content" aria-label="All gallery works">
        <GalleryGrid items={galleryItems} randomize />
      </section>
      <SiteFooter />
    </main>
  );
}
