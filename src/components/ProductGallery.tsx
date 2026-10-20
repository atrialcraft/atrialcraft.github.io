'use client'

import { useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'

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
    <div className="group/carousel relative">
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
            sizes="(min-width: 1024px) 19rem, 42rem"
            priority
          />
        </button>
      )}

      {/* For the keyboard and as a hint; a click on the photo does the same */}
      <button
        type="button"
        onClick={() => openAt(index)}
        aria-label="Открыть фото на весь экран"
        className="absolute top-3 right-3 z-10 hidden size-8 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition group-hover/carousel:opacity-100 hover:bg-black/55 focus-visible:opacity-100 md:flex"
      >
        <ArrowsPointingOutIcon className="size-4" />
      </button>

      <Lightbox
        images={photos}
        index={open ? index : null}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
