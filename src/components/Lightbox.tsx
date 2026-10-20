'use client'

import { useEffect, useRef, useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { motionTransition, overlayFade } from '@/lib/transitions'
import { cn } from '@/lib/utils'

export type LightboxImage = { src: StaticImageData; alt: string }

// How much a mouse click on the open photo magnifies it
const mouseZoomScale = 2
// Touch: a double tap zooms to this, a pinch goes up to the maximum
const doubleTapScale = 2.5
const maxTouchScale = 4

type Point = { x: number; y: number }
type View = { scale: number; x: number; y: number }
type Gesture = {
  start: View
  from: Point
  moved: boolean
  /** Only while pinching */
  distance?: number
  anchor?: Point
}

const restingView: View = { scale: 1, x: 0, y: 0 }

const buttonClassName =
  'absolute z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:invisible'

/**
 * Photos at full screen size on a dark background. `index` is the open photo,
 * null — closed. Arrows, ← → keys and a swipe change the photo; a mouse click,
 * a pinch or a double tap magnifies it; Esc, the cross or a click past the photo closes it
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

  // Mouse: a click zooms in at that point, then the photo follows the pointer
  // so any detail can be reached; another click zooms out
  let [zoomed, setZoomed] = useState(false)
  let [origin, setOrigin] = useState('50% 50%')
  let frameRef = useRef<HTMLDivElement>(null)

  // Touch: own gestures, because inside a fixed dialog the browser's pinch
  // zoom is unreliable (iOS) and would fight the swipe. Two fingers zoom, one
  // finger pans a zoomed photo or swipes to the next one, a double tap zooms
  let [view, setView] = useState(restingView)
  let [gesturing, setGesturing] = useState(false)
  let pointers = useRef(new Map<number, Point>())
  let gesture = useRef<Gesture | null>(null)
  let lastTap = useRef(0)

  let goTo = (next: number) => {
    if (next >= 0 && next < count) {
      setZoomed(false)
      setView(restingView)
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
    setView(restingView)
    onClose()
  }

  /** Pointer position relative to the centre of the photo frame */
  function fromCenter(point: Point) {
    let rect = frameRef.current!.getBoundingClientRect()
    return {
      x: point.x - rect.left - rect.width / 2,
      y: point.y - rect.top - rect.height / 2,
    }
  }

  /** Keeps a zoomed photo covering its frame */
  function clampView(next: View): View {
    let rect = frameRef.current!.getBoundingClientRect()
    let scale = Math.min(maxTouchScale, Math.max(1, next.scale))
    let maxX = (rect.width * (scale - 1)) / 2
    let maxY = (rect.height * (scale - 1)) / 2
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  function startGesture() {
    let [first, second] = [...pointers.current.values()]
    if (second) {
      let mid = fromCenter({
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      })
      gesture.current = {
        start: view,
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        // The point of the photo under the fingers stays under them
        anchor: {
          x: (mid.x - view.x) / view.scale,
          y: (mid.y - view.y) / view.scale,
        },
        from: first,
        moved: true,
      }
    } else if (first) {
      gesture.current = { start: view, from: first, moved: false }
    }
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    setGesturing(true)
    startGesture()
  }

  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType === 'mouse') {
      if (zoomed) pointAt(event)
      return
    }
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    let { start, from, distance, anchor } = gesture.current
    let [first, second] = [...pointers.current.values()]

    if (second && distance && anchor) {
      let scale =
        (start.scale * Math.hypot(first.x - second.x, first.y - second.y)) /
        distance
      let mid = fromCenter({
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      })
      setView({
        scale,
        x: mid.x - anchor.x * scale,
        y: mid.y - anchor.y * scale,
      })
      return
    }

    let dx = first.x - from.x
    let dy = first.y - from.y
    if (Math.hypot(dx, dy) > 8) gesture.current.moved = true
    if (start.scale > 1) {
      setView(
        clampView({ scale: start.scale, x: start.x + dx, y: start.y + dy }),
      )
    } else if (count > 1) {
      setView({ scale: 1, x: dx, y: 0 })
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    if (event.pointerType === 'mouse') {
      if (event.button !== 0) return
      pointAt(event)
      setZoomed(!zoomed)
      return
    }
    if (!pointers.current.delete(event.pointerId)) return
    let ended = gesture.current

    // One finger left after a pinch: carry on panning from it
    if (pointers.current.size > 0) {
      startGesture()
      return
    }
    gesture.current = null
    setGesturing(false)
    if (!ended || index === null) return

    if (!ended.moved) {
      let now = Date.now()
      if (now - lastTap.current < 300) {
        lastTap.current = 0
        let point = fromCenter({ x: event.clientX, y: event.clientY })
        setView(
          view.scale > 1
            ? restingView
            : clampView({
                scale: doubleTapScale,
                x: -point.x * (doubleTapScale - 1),
                y: -point.y * (doubleTapScale - 1),
              }),
        )
      } else {
        lastTap.current = now
      }
      return
    }

    if (ended.start.scale > 1 || view.scale > 1.05) {
      setView(view.scale > 1.05 ? clampView(view) : restingView)
    } else if (view.x < -60) {
      index < count - 1 ? goTo(index + 1) : setView(restingView)
    } else if (view.x > 60) {
      index > 0 ? goTo(index - 1) : setView(restingView)
    } else {
      setView(restingView)
    }
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
                  className="flex max-h-full max-w-full items-center justify-center px-4 py-16 sm:px-20"
                >
                  <div
                    ref={frameRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={(event) => {
                      if (event.pointerType !== 'mouse') onPointerUp(event)
                    }}
                    className={cn(
                      'touch-none overflow-hidden rounded-xl',
                      zoomed
                        ? 'cursor-zoom-out'
                        : 'pointer-fine:cursor-zoom-in',
                    )}
                  >
                    <Image
                      src={current.src}
                      alt={current.alt}
                      sizes="100vw"
                      draggable={false}
                      style={
                        zoomed
                          ? {
                              transform: `scale(${mouseZoomScale})`,
                              transformOrigin: origin,
                            }
                          : {
                              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                            }
                      }
                      className={cn(
                        'h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain select-none',
                        !gesturing &&
                          'transition-transform duration-300 ease-out motion-reduce:transition-none',
                      )}
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
