'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from 'motion/react'

import { logoPath, logoViewBox } from '@/components/Logo'

const clicksToTrigger = 5
const clickWindowMs = 2000
const cutDuration = 3.6
const laserColor = '#ff8a3d'

// Browsers restart a dash pattern at every subpath, so each subpath of the
// logo is its own <path> and they are cut one after another.
const logoSegments = logoPath.split(/(?=M)/).filter(Boolean)

/**
 * Easter egg: five quick clicks on the wrapped element make a "laser" cut the
 * Atrial logo out over the page.
 */
export function LaserEasterEgg({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  let [playing, setPlaying] = useState(false)
  let clicks = useRef<Array<number>>([])

  function onClick() {
    let now = Date.now()
    clicks.current = [
      ...clicks.current.filter((time) => now - time < clickWindowMs),
      now,
    ]
    if (clicks.current.length >= clicksToTrigger) {
      clicks.current = []
      setPlaying(true)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        className="cursor-default"
        onClick={onClick}
      >
        {children}
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {playing && (
              <LaserCut key="laser" onDone={() => setPlaying(false)} />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

function LaserCut({ onDone }: { onDone: () => void }) {
  let reduceMotion = useReducedMotion()
  let cutRefs = useRef<Array<SVGPathElement | null>>([])
  let headRef = useRef<SVGCircleElement>(null)
  let sparksRef = useRef<SVGGElement>(null)
  let [cutDone, setCutDone] = useState(false)

  useEffect(() => {
    let cuts = cutRefs.current.filter((cut) => cut !== null)
    let head = headRef.current
    let sparks = sparksRef.current
    if (cuts.length !== logoSegments.length || !head || !sparks) {
      return
    }

    let finishTimeout: number | undefined
    function finish() {
      setCutDone(true)
      finishTimeout = window.setTimeout(onDone, 1600)
    }

    if (reduceMotion) {
      finish()
      return () => window.clearTimeout(finishTimeout)
    }

    let lengths = cuts.map((cut) => cut.getTotalLength())
    let total = lengths.reduce((sum, length) => sum + length, 0)
    cuts.forEach((cut, i) => {
      cut.style.strokeDasharray = `${lengths[i]}`
      cut.style.strokeDashoffset = `${lengths[i]}`
    })
    let lastSpark = 0

    function emitSpark(x: number, y: number) {
      let spark = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      )
      spark.setAttribute('cx', `${x}`)
      spark.setAttribute('cy', `${y}`)
      spark.setAttribute('r', `${1 + Math.random() * 1.5}`)
      spark.setAttribute('fill', Math.random() > 0.5 ? '#ffd27a' : laserColor)
      sparks!.appendChild(spark)
      let angle = Math.random() * Math.PI * 2
      let distance = 10 + Math.random() * 30
      spark
        .animate(
          [
            { transform: 'translate(0, 0)', opacity: 1 },
            {
              transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 15}px)`,
              opacity: 0,
            },
          ],
          { duration: 350 + Math.random() * 300, easing: 'ease-out' },
        )
        .finished.then(() => spark.remove())
    }

    let controls = animate(0, 1, {
      duration: cutDuration,
      ease: 'linear',
      onUpdate(progress) {
        let remaining = progress * total
        let point: DOMPoint | undefined
        cuts.forEach((cut, i) => {
          let cutLength = Math.min(Math.max(remaining, 0), lengths[i])
          cut.style.strokeDashoffset = `${lengths[i] - cutLength}`
          if (!point && remaining <= lengths[i]) {
            point = cut.getPointAtLength(cutLength)
          }
          remaining -= lengths[i]
        })
        point ??= cuts[cuts.length - 1].getPointAtLength(
          lengths[lengths.length - 1],
        )
        head.setAttribute('cx', `${point.x}`)
        head.setAttribute('cy', `${point.y}`)
        let now = performance.now()
        if (now - lastSpark > 25) {
          lastSpark = now
          emitSpark(point.x, point.y)
        }
      },
      onComplete: finish,
    })

    return () => {
      controls.stop()
      window.clearTimeout(finishTimeout)
    }
  }, [onDone, reduceMotion])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDone}
    >
      <svg
        viewBox={logoViewBox}
        className="w-[min(80vw,640px)] overflow-visible text-foreground"
        aria-hidden
      >
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.path
          d={logoPath}
          fillRule="evenodd"
          fill="currentColor"
          initial={{ opacity: 0 }}
          animate={{ opacity: cutDone ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        />

        <motion.g
          fill="none"
          stroke={laserColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#laser-glow)"
          animate={{ opacity: cutDone ? 0 : 1 }}
          transition={{ duration: 0.6 }}
        >
          {logoSegments.map((segment, i) => (
            <path
              key={i}
              ref={(el) => {
                cutRefs.current[i] = el
              }}
              d={segment}
            />
          ))}
        </motion.g>

        <g ref={sparksRef} filter="url(#laser-glow)" />

        {!cutDone && (
          <circle
            ref={headRef}
            r={5}
            fill="#fff4d6"
            filter="url(#laser-glow)"
          />
        )}
      </svg>
    </motion.div>
  )
}
