'use client'

import { useEffect, useRef, useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { motionTransition, snappySpring } from '@/lib/transitions'
import { cn } from '@/lib/utils'

export type CarouselImage = {
  src: StaticImageData | string
  darkSrc?: StaticImageData | string
  alt?: string
  caption?: string
}

function imageSize(src: StaticImageData | string) {
  if (typeof src === 'string') {
    return { width: 1600, height: 1067 }
  }
  return { width: src.width, height: src.height }
}

const navButtonClassName =
  'absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 shadow-foreground/5 ring-border transition hover:bg-muted disabled:pointer-events-none disabled:opacity-30 md:flex dark:bg-muted dark:hover:bg-muted/80'

// Arrows over the photo for narrow columns: small, translucent and only
// while the pointer is over the photo, so they don't compete with it
const overlayButtonClassName =
  'absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition group-hover/carousel:opacity-100 hover:bg-black/55 focus-visible:opacity-100 disabled:invisible md:flex'

export function ImageCarousel({
  images,
  caption,
  className,
  imageClassName,
  controlsInside = false,
  index: controlledIndex,
  onIndexChange,
  onImageClick,
}: {
  images: CarouselImage[]
  caption?: string
  className?: string
  imageClassName?: string
  /** Arrows over the photo, shown on hover, instead of in the side gutters */
  controlsInside?: boolean
  /** Current photo, when the parent keeps it (e.g. in sync with a lightbox) */
  index?: number
  onIndexChange?: (index: number) => void
  /** Click (not a swipe) on the photo, e.g. to open it full screen */
  onImageClick?: (index: number) => void
}) {
  let count = images.length
  let [ownIndex, setOwnIndex] = useState(0)
  let index = controlledIndex ?? ownIndex
  let [width, setWidth] = useState(0)
  let containerRef = useRef<HTMLDivElement>(null)
  let reduceMotion = useReducedMotion()
  let current = images[index]
  let canGoPrev = index > 0
  let canGoNext = index < count - 1

  useEffect(() => {
    let node = containerRef.current
    if (!node) return

    let update = () => setWidth(node.offsetWidth)
    update()

    let observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function goTo(next: number) {
    let clamped = Math.max(0, Math.min(count - 1, next))
    setOwnIndex(clamped)
    onIndexChange?.(clamped)
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    let swipePower = Math.abs(info.offset.x) * Math.abs(info.velocity.x)
    if (
      canGoNext &&
      (info.offset.x < -40 || (info.velocity.x < -300 && swipePower > 8000))
    ) {
      goTo(index + 1)
      return
    }
    if (
      canGoPrev &&
      (info.offset.x > 40 || (info.velocity.x > 300 && swipePower > 8000))
    ) {
      goTo(index - 1)
    }
  }

  if (count === 0 || !current) return null

  let maxDrag = Math.max(0, (count - 1) * width)

  return (
    <figure className={cn('not-prose my-8', className)}>
      {/*
        On desktop, pull out with negative margin and pad back in so the image
        stays content-width while nav buttons sit in the side gutters (not clipped).
      */}
      <div
        className={cn(
          'relative',
          controlsInside ? 'group/carousel' : 'md:-mx-12 md:px-12',
        )}
      >
        <div
          ref={containerRef}
          className="overflow-hidden rounded-3xl bg-muted"
        >
          <motion.div
            className={cn(
              'flex',
              onImageClick
                ? 'cursor-zoom-in'
                : 'cursor-grab active:cursor-grabbing',
            )}
            // Motion cancels a tap once the pointer starts dragging, so a swipe doesn't open the photo
            onTap={onImageClick ? () => onImageClick(index) : undefined}
            {...(onImageClick && {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Открыть фото на весь экран',
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onImageClick(index)
                }
              },
            })}
            animate={{ x: width ? -index * width : 0 }}
            transition={motionTransition(snappySpring, reduceMotion)}
            drag={width > 0 ? 'x' : false}
            dragConstraints={{ left: -maxDrag, right: 0 }}
            dragElastic={0.14}
            onDragEnd={onDragEnd}
          >
            {images.map((image, i) => {
              let size = imageSize(image.src)
              let darkSize = image.darkSrc ? imageSize(image.darkSrc) : size
              return (
                <div
                  key={i}
                  className="shrink-0 grow-0"
                  style={{ width: width || '100%' }}
                >
                  <>
                    <Image
                      src={image.src}
                      alt={image.alt ?? ''}
                      width={size.width}
                      height={size.height}
                      sizes="(min-width: 768px) 672px, 100vw"
                      className={cn(
                        'pointer-events-none aspect-3/2 h-auto w-full object-cover',
                        image.darkSrc && 'dark:hidden',
                        imageClassName,
                      )}
                      priority={i === 0}
                      draggable={false}
                    />
                    {image.darkSrc && (
                      <Image
                        src={image.darkSrc}
                        alt={image.alt ?? ''}
                        width={darkSize.width}
                        height={darkSize.height}
                        sizes="(min-width: 768px) 672px, 100vw"
                        className={cn(
                          'pointer-events-none hidden aspect-3/2 h-auto w-full object-cover dark:block',
                          imageClassName,
                        )}
                        priority={i === 0}
                        draggable={false}
                      />
                    )}
                  </>
                </div>
              )
            })}
          </motion.div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Предыдущее фото"
              disabled={!canGoPrev}
              className={
                controlsInside
                  ? cn(overlayButtonClassName, 'left-3')
                  : cn(navButtonClassName, 'left-0')
              }
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Следующее фото"
              disabled={!canGoNext}
              className={
                controlsInside
                  ? cn(overlayButtonClassName, 'right-3')
                  : cn(navButtonClassName, 'right-0')
              }
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        // Dots right under the photo, so it is clear what they belong to
        <div className="mt-1.5 flex items-center justify-center">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Фото ${i + 1} из ${count}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
              className="group flex items-center justify-center p-2.5"
            >
              <span
                className={cn(
                  'size-2 rounded-full transition',
                  i === index
                    ? 'bg-foreground'
                    : 'bg-foreground/20 group-hover:bg-foreground/45',
                )}
              />
            </button>
          ))}
          <span className="sr-only">
            Фото {index + 1} из {count}
          </span>
        </div>
      )}
      {/*
        All captions share one grid cell: the block is as tall as the longest of
        them, so the page doesn't jump while swiping and has no empty gap
      */}
      {(caption || images.some((image) => image.caption)) && (
        <div className={cn('grid', count > 1 ? 'mt-1' : 'mt-4')}>
          {images.map((image, i) => (
            <figcaption
              key={i}
              aria-hidden={i !== index}
              className={cn(
                'col-start-1 row-start-1 text-sm leading-6 text-pretty text-muted-foreground/75 transition-[opacity,filter] duration-300 motion-reduce:transition-none',
                i === index
                  ? 'blur-0 opacity-100'
                  : 'invisible opacity-0 blur-[2px]',
              )}
            >
              {image.caption ?? caption}
            </figcaption>
          ))}
        </div>
      )}
    </figure>
  )
}
