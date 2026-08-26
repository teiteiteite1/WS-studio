"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type GalleryItem = {
  src: string;
  alt: string;
};

function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export default function GalleryGrid({
  items,
  randomize = false,
  limit,
}: {
  items: readonly GalleryItem[];
  randomize?: boolean;
  limit?: number;
}) {
  const [visibleItems, setVisibleItems] = useState(() => items.slice(0, limit));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeItem = useMemo(
    () => (activeIndex === null ? null : visibleItems[activeIndex] ?? null),
    [activeIndex, visibleItems],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextItems = randomize ? shuffleItems(items) : [...items];
      setVisibleItems(nextItems.slice(0, limit));
      setActiveIndex(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [items, limit, randomize]);

  useEffect(() => {
    if (activeIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % visibleItems.length,
        );
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null
            ? null
            : (current - 1 + visibleItems.length) % visibleItems.length,
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, visibleItems.length]);

  function showPrevious() {
    setActiveIndex((current) =>
      current === null
        ? null
        : (current - 1 + visibleItems.length) % visibleItems.length,
    );
  }

  function showNext() {
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % visibleItems.length,
    );
  }

  function showRandom() {
    if (visibleItems.length === 0) return;
    if (visibleItems.length === 1) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => {
      let next = Math.floor(Math.random() * visibleItems.length);
      while (next === current) next = Math.floor(Math.random() * visibleItems.length);
      return next;
    });
  }

  return (
    <>
      <div className="gallery-grid">
        {visibleItems.map((item, index) => (
          <figure className="gallery-card" key={item.src}>
            <button
              className="gallery-card-button"
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Open artwork: ${item.alt}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1100px) 50vw, 33vw"
              />
            </button>
          </figure>
        ))}
      </div>

      {visibleItems.length > 0 && (
        <div className="gallery-discovery">
          <button type="button" onClick={showRandom}>RANDOM WORK ↗</button>
        </div>
      )}

      {activeItem && activeIndex !== null && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Artwork viewer">
          <button
            className="gallery-lightbox-backdrop"
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close artwork viewer"
          />
          <div className="gallery-lightbox-panel">
            <button
              className="gallery-lightbox-close"
              type="button"
              onClick={() => setActiveIndex(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="gallery-lightbox-image">
              <Image
                src={activeItem.src}
                alt={activeItem.alt}
                fill
                priority
                sizes="90vw"
              />
            </div>
            <div className="gallery-lightbox-controls">
              <button type="button" onClick={showPrevious}>← PREV</button>
              <button type="button" onClick={showRandom}>RANDOM</button>
              <button type="button" onClick={showNext}>NEXT →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
