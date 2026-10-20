'use client'

import { useState } from 'react'
import Image, { type ImageProps, type StaticImageData } from 'next/image'

import { Lightbox } from '@/components/Lightbox'

/**
 * A photo in an article that opens full screen on click, like on the product
 * page. Only imported photos can open: their size is known for the viewer
 */
export function ZoomableImage(props: ImageProps) {
  let [open, setOpen] = useState(false)

  if (typeof props.src !== 'object' || !('width' in props.src)) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...props} />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Открыть фото на весь экран"
        className="block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image {...props} />
      </button>
      <Lightbox
        images={[{ src: props.src as StaticImageData, alt: props.alt }]}
        index={open ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
