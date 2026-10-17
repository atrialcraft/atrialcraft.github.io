'use client'

import { useSyncExternalStore } from 'react'

/**
 * Visitor's choice about analytics cookies, kept in localStorage.
 * null — not decided yet (the banner is shown, counters are not loaded).
 */
export type Consent = 'accepted' | 'declined' | null

const storageKey = 'analytics-consent'
const changeEvent = 'analytics-consent-change'

function read(): Consent {
  try {
    let value = window.localStorage.getItem(storageKey)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try {
    if (value) {
      window.localStorage.setItem(storageKey, value)
    } else {
      window.localStorage.removeItem(storageKey)
    }
  } catch {
    // Private mode etc.: the choice just won't be remembered
  }
  window.dispatchEvent(new Event(changeEvent))
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(changeEvent, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Returns undefined during prerender, when the choice is not known yet */
export function useConsent(): Consent | undefined {
  return useSyncExternalStore<Consent | undefined>(
    subscribe,
    read,
    () => undefined,
  )
}
