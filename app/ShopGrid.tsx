"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type ShopProduct = { title: string; price: string; image: string; url: string };

function shuffleProducts(products: readonly ShopProduct[]) {
  const shuffled = [...products];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export default function ShopGrid({ products }: { products: readonly ShopProduct[] }) {
  const [visibleProducts, setVisibleProducts] = useState(() => products.slice(0, 3));
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisibleProducts(shuffleProducts(products).slice(0, 3)));
    return () => window.cancelAnimationFrame(frame);
  }, [products]);

  return <div className="shop-grid">{visibleProducts.map((product) => (
    <article className="shop-card" key={product.url}>
      <a href={product.url} target="_blank" rel="noreferrer" >
        <div className="shop-image"><Image src={product.image} alt={product.title} fill sizes="(max-width: 640px) 33vw, (max-width: 1100px) 50vw, 33vw" /></div>
        <div className="shop-meta"><h3>{product.title}</h3><p>{product.price}</p></div>
      </a>
    </article>
  ))}</div>;
}
