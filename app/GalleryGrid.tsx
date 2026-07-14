import Image from "next/image";

type GalleryItem = {
  src: string;
  alt: string;
};

export default function GalleryGrid({ items }: { items: readonly GalleryItem[] }) {
  return (
    <div className="gallery-grid">
      {items.map((item, index) => (
        <figure className="gallery-card" key={item.src}>
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1100px) 50vw, 33vw"
          />
          <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
        </figure>
      ))}
    </div>
  );
}
