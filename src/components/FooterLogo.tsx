'use client'

import { useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'

import { MadeInBryanskLogo } from '@/components/MadeInBryanskLogo'

const pacmanSize = 32
const eatDuration = 2.2
const restoreDelay = 1000
const pacmanColor = '#ffcc02'

/** Pac-Man shape with the mouth opened by `angle` degrees each way */
function pacmanPath(angle: number) {
  let r = pacmanSize / 2
  let a = (angle * Math.PI) / 180
  let x = r + r * Math.cos(a)
  let y = r * Math.sin(a)
  return `M${r} ${r}L${x} ${r - y}A${r} ${r} 0 1 0 ${x} ${r + y}Z`
}

/**
 * Footer logo easter egg: a click sends Pac-Man across the logo, eating it
 * from left to right; the logo comes back a moment later.
 */
export function FooterLogo() {
  let [eating, setEating] = useState(false)
  let logoRef = useRef<HTMLButtonElement>(null)
  let reduceMotion = useReducedMotion()

  // Pac-Man's left edge, relative to the logo
  let x = useMotionValue(-pacmanSize)
  // Everything left of Pac-Man's centre is eaten
  let clipPath = useTransform(
    x,
    (value) => `inset(0 0 0 ${Math.max(0, value + pacmanSize / 2)}px)`,
  )
  let logoOpacity = useMotionValue(1)

  async function onClick() {
    let logo = logoRef.current
    if (eating || !logo) {
      return
    }
    setEating(true)

    if (reduceMotion) {
      await animate(logoOpacity, 0, { duration: 0.2 })
    } else {
      let width = logo.getBoundingClientRect().width
      x.set(-pacmanSize)
      await animate(x, width + pacmanSize, {
        duration: eatDuration,
        ease: 'linear',
      })
      logoOpacity.set(0)
    }

    await new Promise((resolve) => setTimeout(resolve, restoreDelay))
    x.set(-pacmanSize)
    await animate(logoOpacity, 1, { duration: 0.4 })
    setEating(false)
  }

  return (
    <div className="relative">
      <button
        ref={logoRef}
        type="button"
        aria-label="Сделано брянскими в Брянске"
        className="block cursor-default"
        onClick={onClick}
      >
        <motion.span
          className="block"
          style={{ clipPath, opacity: logoOpacity }}
        >
          <MadeInBryanskLogo className="h-10 w-auto flex-none text-foreground" />
        </motion.span>
      </button>

      {eating && !reduceMotion && (
        <motion.svg
          aria-hidden
          width={pacmanSize}
          height={pacmanSize}
          viewBox={`0 0 ${pacmanSize} ${pacmanSize}`}
          className="pointer-events-none absolute top-1/2 left-0 -mt-4"
          style={{ x }}
        >
          <motion.path
            fill={pacmanColor}
            initial={{ d: pacmanPath(40) }}
            animate={{ d: [pacmanPath(40), pacmanPath(2), pacmanPath(40)] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
          />
          <circle
            cx={pacmanSize / 2 + 2}
            cy={pacmanSize / 4}
            r={2}
            className="fill-background"
          />
        </motion.svg>
      )}
    </div>
  )
}
