'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Set on <html> while a product opens or closes; PageEnter skips its own animation then */
export const productTransitionAttribute = 'data-product-transition'

export function isProductTransition() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute(productTransitionAttribute)
  )
}

/** Photo frame of a product card in the market, or on the product page */
function cardPhoto(href: string) {
  return document
    .querySelector(`[data-product-card] a[href="${href}"]`)
    ?.closest('[data-product-card]')
    ?.querySelector<HTMLElement>('[data-product-cover]')
}

function pagePhoto() {
  let gallery = document.querySelector<HTMLElement>('[data-product-photo]')
  return gallery?.querySelector<HTMLElement>('.rounded-3xl') ?? gallery
}

/** Waits for the new page: the update callback of a view transition runs with rendering paused */
function waitFor<T>(find: () => T | null | undefined, timeout = 2500) {
  return new Promise<T | null>((resolve) => {
    let start = Date.now()
    let check = () => {
      let found = find()
      if (found) resolve(found)
      else if (Date.now() - start > timeout) resolve(null)
      else setTimeout(check, 16)
    }
    check()
  })
}

/**
 * Opening a product from the market feels like a sheet: the photo of the
 * card grows into the photo of the product page and the page slides up
 * (View Transitions API). The back button of the product page plays it in
 * reverse. It is still an ordinary page with its own address; browsers
 * without view transitions, reduced motion and new tabs just navigate.
 */
export function ProductTransition() {
  let router = useRouter()

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }
      let link = (event.target as Element).closest<HTMLAnchorElement>(
        '[data-product-card] a[href^="/market/"], a[data-product-back]',
      )
      if (!link) return
      let open = !link.hasAttribute('data-product-back')
      let from = open ? cardPhoto(link.getAttribute('href')!) : pagePhoto()
      if (!from) return
      event.preventDefault()

      let productHref = open ? link.getAttribute('href')! : location.pathname
      let target = open ? productHref : '/market'
      let root = document.documentElement
      let main = document.querySelector('main')!
      root.setAttribute(productTransitionAttribute, open ? 'open' : 'close')
      from.style.viewTransitionName = 'product-photo'
      // Different names before and after: the old content fades where it
      // was and the new one comes in, instead of one block morphing
      main.style.viewTransitionName = 'page-old'

      let transition = document.startViewTransition(async () => {
        from.style.viewTransitionName = ''
        router.push(target, { scroll: false })
        let to = await waitFor(() =>
          location.pathname.replace(/\/$/, '') === target
            ? open
              ? pagePhoto()
              : cardPhoto(productHref)
            : null,
        )
        window.scrollTo(0, 0)
        // Back in the market: the card of this product stays in view
        if (to && to.getBoundingClientRect().bottom > window.innerHeight) {
          to.scrollIntoView({ block: 'nearest' })
        }
        if (to) to.style.viewTransitionName = 'product-photo'
        main.style.viewTransitionName = 'page-new'
      })
      transition.finished.finally(() => {
        root.removeAttribute(productTransitionAttribute)
        document
          .querySelectorAll<HTMLElement>('[style*="view-transition-name"]')
          .forEach((element) => (element.style.viewTransitionName = ''))
      })
    }

    // Capture: runs before next/link, which then sees the prevented click and stays out
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router])

  return null
}
