'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/components/Button'
import { setConsent, useConsent } from '@/lib/consent'

/** Asks for consent to analytics cookies until the visitor decides */
export function CookieBanner() {
  let consent = useConsent()
  let reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {consent === null && (
        <motion.div
          role="dialog"
          aria-label="Согласие на cookies"
          className="fixed inset-x-4 bottom-4 z-50 rounded-2xl bg-card p-5 shadow-lg ring-1 shadow-foreground/5 ring-border sm:right-auto sm:left-8 sm:max-w-md dark:bg-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
        >
          <p className="text-sm text-muted-foreground">
            Сайт использует cookies и сервисы аналитики — Яндекс Метрику и
            пиксель Telegram, чтобы понимать, как им пользуются. Подробнее — в{' '}
            <Link href="/privacy" className="link-underline text-foreground">
              политике конфиденциальности
            </Link>
            .
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setConsent('accepted')}>Принять</Button>
            <Button variant="secondary" onClick={() => setConsent('declined')}>
              Отклонить
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Lets the visitor change their mind: shows the banner again */
export function ResetConsentButton() {
  let consent = useConsent()

  return (
    <Button variant="secondary" onClick={() => setConsent(null)}>
      {consent === 'accepted'
        ? 'Отозвать согласие на cookies'
        : 'Изменить решение о cookies'}
    </Button>
  )
}
