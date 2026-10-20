'use client'

import { useEffect, useRef, useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'

import { motionTransition, overlayFade } from '@/lib/transitions'
import { cn } from '@/lib/utils'

export type LightboxImage = { src: StaticImageData; alt: string }

// How much a click on the open photo magnifies it
const zoomScale = 2

const buttonClassName =
  'absolute z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:invisible'

/**
 * Photos at full screen size on a dark background. `index` is the open photo,
 * null — closed. Arrows, ← → keys and a swipe change the photo, a click on it
 * magnifies it, Esc, the cross or a click past the photo closes it
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  let reduceMotion = useReducedMotion()
  let open = index !== null
  let count = images.length
  let current = index !== null ? images[index] : undefined

  // Magnifier: a click zooms in at that point, then the photo follows the
  // pointer (or finger) so any detail can be reached; another click zooms out
  let [zoomed, setZoomed] = useState(false)
  let [origin, setOrigin] = useState('50% 50%')
  let frameRef = useRef<HTMLDivElement>(null)

  let goTo = (next: number) => {
    if (next >= 0 && next < count) {
      setZoomed(false)
      onIndexChange(next)
    }
  }

  function pointAt(event: { clientX: number; clientY: number }) {
    let rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    let x = ((event.clientX - rect.left) / rect.width) * 100
    let y = ((event.clientY - rect.top) / rect.height) * 100
    let clamp = (value: number) => Math.min(100, Math.max(0, value))
    setOrigin(`${clamp(x)}% ${clamp(y)}%`)
  }

  function close() {
    setZoomed(false)
    onClose()
  }

  useEffect(() => {
    if (index === null) return
    let onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goTo(index - 1)
      if (event.key === 'ArrowRight') goTo(index + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function onDragEnd(_: unknown, info: PanInfo) {
    if (index === null) return
    if (info.offset.x < -60 || info.velocity.x < -400) goTo(index + 1)
    else if (info.offset.x > 60 || info.velocity.x > 400) goTo(index - 1)
  }

  return (
    // `static` keeps the tree mounted so AnimatePresence can play the exit
    <Dialog static open={open} onClose={close} className="relative z-70">
      <AnimatePresence>
        {index !== null && current && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTransition(overlayFade, reduceMotion)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          >
            <DialogPanel
              className="flex size-full items-center justify-center"
              onClick={(event) => {
                if (event.target === event.currentTarget) close()
              }}
            >
              <DialogTitle className="sr-only">{current.alt}</DialogTitle>

              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={motionTransition(overlayFade, reduceMotion)}
                  // While zoomed, moving the finger pans the photo instead of swiping
                  drag={count > 1 && !zoomed ? 'x' : false}
                  dragSnapToOrigin
                  dragElastic={0.3}
                  onDragEnd={onDragEnd}
                  // A tap is cancelled once a swipe starts, so swiping doesn't zoom
                  onTap={(event) => {
                    pointAt(event as PointerEvent)
                    setZoomed(!zoomed)
                  }}
                  className="flex max-h-full max-w-full items-center justify-center px-4 py-16 sm:px-20"
                >
                  <div
                    ref={frameRef}
                    onPointerMove={zoomed ? pointAt : undefined}
                    className={cn(
                      'overflow-hidden rounded-xl',
                      zoomed ? 'cursor-zoom-out touch-none' : 'cursor-zoom-in',
                    )}
                  >
                    <Image
                      src={current.src}
                      alt={current.alt}
                      sizes="100vw"
                      draggable={false}
                      style={{
                        transform: `scale(${zoomed ? zoomScale : 1})`,
                        transformOrigin: origin,
                      }}
                      className="h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain transition-transform duration-300 ease-out select-none motion-reduce:transition-none"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className={cn(buttonClassName, 'top-4 right-4')}
              >
                <XMarkIcon className="size-6" />
              </button>

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                    aria-label="Предыдущее фото"
                    className={cn(
                      buttonClassName,
                      'top-1/2 left-4 hidden -translate-y-1/2 sm:flex',
                    )}
                  >
                    <ChevronLeftIcon className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    disabled={index === count - 1}
                    aria-label="Следующее фото"
                    className={cn(
                      buttonClassName,
                      'top-1/2 right-4 hidden -translate-y-1/2 sm:flex',
                    )}
                  >
                    <ChevronRightIcon className="size-6" />
                  </button>
                  {/* The same dots as under the carousels on the site */}
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center">
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
                              ? 'bg-white'
                              : 'bg-white/25 group-hover:bg-white/50',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </DialogPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
