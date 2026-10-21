import { buyLinks } from '@/lib/site'

/**
 * Strip pinned to the top of the screen while the new site is being finished.
 * Its height is --banner-h: the layout and the sticky header are shifted by
 * it. Switched on and off with showTestBanner in src/lib/site.ts.
 */
export function TestBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-60 flex h-(--banner-h) items-center justify-center bg-[#ffcc00] px-4 text-center text-xs font-medium text-[#111111]">
      <p className="truncate">
        <span className="lg:hidden">Тестовая версия, возможны ошибки.</span>
        <span className="hidden lg:inline">
          Это тестовая версия нового сайта: он постепенно обновляется, возможны
          ошибки и неточности.
        </span>{' '}
        <a
          href={buyLinks.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          <span className="lg:hidden">Напишите</span>
          <span className="hidden lg:inline">Заметили — напишите</span>
        </a>
      </p>
    </div>
  )
}
