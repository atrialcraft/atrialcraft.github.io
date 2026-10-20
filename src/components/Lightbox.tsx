'use client'

import { useEffect } from 'react'
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

const buttonClassName =
  'absolute z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:invisible'

/**
 * Photos at full screen size on a dark background. `index` is the open photo,
 * null — closed. Arrows, ← → keys and a swipe change the photo, Esc, the cross
 * or a click past the photo closes it
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

  let goTo = (next: number) => {
    if (next >= 0 && next < count) onIndexChange(next)
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
    <Dialog static open={open} onClose={onClose} className="relative z-70">
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
                if (event.target === event.currentTarget) onClose()
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
                  drag={count > 1 ? 'x' : false}
                  dragSnapToOrigin
                  dragElastic={0.3}
                  onDragEnd={onDragEnd}
                  className="flex max-h-full max-w-full items-center justify-center px-4 py-16 sm:px-20"
                >
                  <Image
                    src={current.src}
                    alt={current.alt}
                    sizes="100vw"
                    draggable={false}
                    className="h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full rounded-xl object-contain select-none"
                  />
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={onClose}
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
