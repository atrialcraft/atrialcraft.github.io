'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'

import { MadeInBryanskLogo } from '@/components/MadeInBryanskLogo'
import { partisans } from '@/lib/partisans'

const runDuration = 5
// A squad: which silhouette runs and how far behind the previous one
const squad = [
  { figure: 0, delay: 0 },
  { figure: 1, delay: 0.55 },
  { figure: 0, delay: 1.1 },
]

type Run = { id: number; width: number }

/**
 * Footer logo easter egg: every click sends a squad of partisans running
 * along the top of the footer.
 */
export function FooterLogo() {
  let [runs, setRuns] = useState<Array<Run>>([])
  let [footer, setFooter] = useState<HTMLElement | null>(null)
  let wrapperRef = useRef<HTMLDivElement>(null)
  let nextId = useRef(0)

  function onClick() {
    setFooter(wrapperRef.current?.closest('footer') ?? null)
    let run = { id: nextId.current++, width: window.innerWidth }
    setRuns((current) => [...current, run])
  }

  function onRunDone(id: number) {
    setRuns((current) => current.filter((run) => run.id !== id))
  }

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        aria-label="Сделано брянскими в Брянске"
        className="cursor-default"
        onClick={onClick}
      >
        <MadeInBryanskLogo className="h-10 w-auto flex-none text-foreground" />
      </button>
      {footer &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-14 -translate-y-full overflow-hidden"
          >
            {runs.map((run) => (
              <Squad
                key={run.id}
                width={run.width}
                onDone={() => onRunDone(run.id)}
              />
            ))}
          </div>,
          footer,
        )}
    </div>
  )
}

function Squad({ width, onDone }: { width: number; onDone: () => void }) {
  return (
    <>
      {squad.map(({ figure, delay }, i) => (
        <Runner
          key={i}
          figure={figure}
          delay={delay}
          width={width}
          onDone={i === squad.length - 1 ? onDone : undefined}
        />
      ))}
    </>
  )
}

function Runner({
  figure,
  delay,
  width,
  onDone,
}: {
  figure: number
  delay: number
  width: number
  onDone?: () => void
}) {
  let reduceMotion = useReducedMotion()
  let { viewBox, d } = partisans[figure]

  return (
    <motion.div
      className="absolute bottom-0 left-0 h-12 text-foreground"
      initial={{ x: -120 }}
      animate={{ x: width + 40 }}
      transition={{ duration: runDuration, ease: 'linear', delay }}
      onAnimationComplete={onDone}
    >
      <motion.svg
        viewBox={viewBox}
        className="h-full w-auto"
        fill="currentColor"
        // A small bounce in step with the run
        animate={
          reduceMotion ? undefined : { y: [0, -4, 0], rotate: [0, -3, 0] }
        }
        transition={{ duration: 0.32, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d={d} />
      </motion.svg>
    </motion.div>
  )
}
