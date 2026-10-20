'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { buttonClassName } from '@/components/Button'
import { TelegramIcon, VKIcon } from '@/components/SocialIcons'
import { buyLinks } from '@/lib/site'
import { cn } from '@/lib/utils'

// Motion animates these buttons, so CSS may only transition colours (CSS
// transitions on opacity fight the JS animation); no grey tap flash on iOS.
const motionButtonClassName =
  'h-10 transition-colors [-webkit-tap-highlight-color:transparent]'

// «Купить» and the pair of channel buttons are exactly as wide as each other
// (2 × 2.5rem + 0.5rem gap), so opening them doesn't push the neighbours
const rootClassName = 'inline-flex h-10 w-[5.5rem]'

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
  available = true,
  className,
}: {
  productName: string
  available?: boolean
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
  // Opacity only: scaling together with CSS transitions glitched in iOS Safari.
  let transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.12, ease: 'easeOut' as const }

  if (!available) {
    return (
      <div className={cn(rootClassName, className)}>
        <button
          type="button"
          disabled
          title="Скоро в продаже"
          className={buttonClassName(
            'primary',
            'h-10 w-full cursor-not-allowed opacity-40 hover:bg-primary',
          )}
        >
          Купить
        </button>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn(rootClassName, className)}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="channels"
            className="flex w-full gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                className={buttonClassName(
                  'primary',
                  cn(motionButtonClassName, 'w-10 px-0'),
                )}
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
            className={buttonClassName(
              'primary',
              cn(motionButtonClassName, 'w-full px-3'),
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
