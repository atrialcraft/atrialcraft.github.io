'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { buttonClassName } from '@/components/Button'
import { TelegramIcon, VKIcon } from '@/components/SocialIcons'
import { buyLinks } from '@/lib/site'
import { cn } from '@/lib/utils'

const channels = [
  { href: buyLinks.telegram, label: 'Telegram', icon: TelegramIcon },
  { href: buyLinks.vk, label: 'ВКонтакте', icon: VKIcon },
]

/**
 * «Купить» splits into Telegram and VK buttons: Telegram is blocked for many
 * people in Russia, so there is always a second way to write.
 */
export function BuyButton({
  productName,
  className,
}: {
  productName: string
  className?: string
}) {
  let [open, setOpen] = useState(false)
  let rootRef = useRef<HTMLDivElement>(null)
  let reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) {
      return
    }

    rootRef.current?.querySelector('a')?.focus()

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Exit first, then enter: overlapping the two states looked jumpy on phones.
  let transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.12, ease: 'easeOut' as const }

  return (
    <div ref={rootRef} className={cn('inline-flex h-10', className)}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="channels"
            className="flex gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transition}
          >
            {channels.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Купить «${productName}»: написать в ${label}`}
                title={`Написать в ${label}`}
                className={buttonClassName('primary', 'h-10 px-3')}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-5 fill-current" />
              </a>
            ))}
          </motion.div>
        ) : (
          <motion.button
            key="buy"
            type="button"
            aria-expanded={false}
            className={buttonClassName('primary', 'h-10')}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transition}
            onClick={() => setOpen(true)}
          >
            Купить
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
