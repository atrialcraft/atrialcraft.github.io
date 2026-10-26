'use client'

import { useState } from 'react'
import Image, { type StaticImageData } from 'next/image'

import { ImageCarousel } from '@/components/ImageCarousel'
import { Lightbox } from '@/components/Lightbox'

/** Product photos: a 3:4 carousel (or one photo); a click opens them full screen */
export function ProductGallery({
  images,
  name,
}: {
  images: Array<StaticImageData>
  name: string
}) {
  let [index, setIndex] = useState(0)
  let [open, setOpen] = useState(false)
  let photos = images.map((src, i) => ({
    src,
    alt: images.length > 1 ? `${name}, фото ${i + 1}` : name,
  }))

  function openAt(i: number) {
    setIndex(i)
    setOpen(true)
  }

  return (
    <div>
      {photos.length > 1 ? (
        <ImageCarousel
          controlsInside
          className="my-0"
          imageClassName="aspect-3/4"
          images={photos}
          index={index}
          onIndexChange={setIndex}
          onImageClick={openAt}
        />
      ) : (
        <button
          type="button"
          onClick={() => openAt(0)}
          className="block w-full cursor-zoom-in overflow-hidden rounded-3xl bg-muted"
        >
          <Image
            src={photos[0].src}
            alt={photos[0].alt}
            className="aspect-3/4 h-auto w-full object-cover"
            sizes="(min-width: 1024px) 27rem, 42rem"
            priority
          />
        </button>
      )}

      <Lightbox
        images={photos}
        index={open ? index : null}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
