"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextItems = randomize ? shuffleItems(items) : [...items];
      setVisibleItems(nextItems.slice(0, limit));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [items, limit, randomize]);

  return (
    <div className="gallery-grid">
      {visibleItems.map((item) => (
        <figure className="gallery-card" key={item.src}>
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1100px) 50vw, 33vw"
          />
        </figure>
      ))}
    </div>
  );
}
