import Image, { type ImageProps } from 'next/image'

import { cn } from '@/lib/utils'

type Size = 'small' | 'medium' | 'full'
type Align = 'left' | 'center' | 'right'

const widths: Record<Size, string> = {
  small: 'sm:w-1/2',
  medium: 'sm:w-3/4',
  full: 'w-full',
}

const blockAlign: Record<Align, string> = {
  left: 'sm:mr-auto',
  center: 'sm:mx-auto',
  right: 'sm:ml-auto',
}

const captionAlign: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Photo in an article with size and alignment:
 * <Photo src={photo01} alt="…" caption="…" size="small" align="right" wrap />
 * `wrap` lets the text flow around a small/medium photo. On phones every
 * photo is full width, otherwise it would be too small to see.
 */
export function Photo({
  src,
  alt = '',
  caption,
  size = 'full',
  align = 'center',
  wrap = false,
}: {
  src: ImageProps['src']
  alt?: string
  caption?: React.ReactNode
  size?: Size
  align?: Align
  wrap?: boolean
}) {
  let floating = wrap && size !== 'full' && align !== 'center'

  return (
    <figure
      className={cn(
        'w-full',
        widths[size],
        floating
          ? align === 'left'
            ? 'sm:float-left sm:mt-1 sm:mr-6 sm:mb-4'
            : 'sm:float-right sm:mt-1 sm:mb-4 sm:ml-6'
          : blockAlign[align],
      )}
    >
      <Image src={src} alt={alt} className="h-auto w-full" />
      {caption ? (
        <figcaption className={cn(!floating && captionAlign[align])}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
