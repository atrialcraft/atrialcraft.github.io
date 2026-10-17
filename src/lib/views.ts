import views from '@/data/views.json'

// Page views from Yandex Metrika, refreshed by scripts/fetch-views.mjs before
// each build (the site is rebuilt daily). Empty when there is no token.
const viewsByPath: Record<string, number> = views

export function getViews(href: string): number | undefined {
  return viewsByPath[href]
}

export function formatViews(count: number) {
  return count.toLocaleString('ru-RU')
}
