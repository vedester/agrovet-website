"use client";

import Image from "next/image";
import { useState } from "react";

import type { Photo } from "@/features/catalog/types";

import PhotoPlaceholder from "./PhotoPlaceholder";

type ProductGalleryProps = {
  photos: Photo[];
  productName: string;
};

export default function ProductGallery({ photos, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = photos[selected];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-brand-50 ring-1 ring-line">
        {current ? (
          <Image
            key={current.id}
            src={current.src}
            alt={current.alt || productName}
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      {photos.length > 1 && (
        <ul aria-label="Product photos" className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Show photo ${index + 1} of ${photos.length}`}
                aria-pressed={index === selected}
                className={`relative block aspect-square w-full overflow-hidden rounded-xl ring-2 transition ${
                  index === selected ? "ring-brand-600" : "ring-transparent hover:ring-brand-200"
                }`}
              >
                <Image src={photo.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
