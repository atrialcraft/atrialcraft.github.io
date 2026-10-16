'use client'

import { useEffect, useState } from 'react'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

/** Floating "back to top" button that appears on long pages */
export function ScrollToTop() {
  let [visible, setVisible] = useState(false)
  let reduceMotion = useReducedMotion()

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 1.5)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Наверх"
          title="Наверх"
          className="fixed right-4 bottom-6 z-40 rounded-full bg-card/90 p-3 shadow-lg ring-1 shadow-foreground/5 ring-border backdrop-blur-sm transition-colors hover:text-accent sm:right-8 sm:bottom-8 dark:bg-muted/90 dark:hover:ring-foreground/20"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: reduceMotion ? 'auto' : 'smooth',
            })
          }
        >
          <ArrowUpIcon className="size-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
