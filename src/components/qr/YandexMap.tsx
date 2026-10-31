'use client'

import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'

/** JavaScript API key, a repository variable; without it the map is not shown */
export const yandexMapsKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY ?? ''

type LngLat = [number, number]

// The parts of ymaps3 used here
type YMaps = {
  ready: Promise<void>
  YMap: new (element: HTMLElement, props: { location: { center: LngLat; zoom: number } }) => YMapEntity & {
    update: (props: { location: { center: LngLat; zoom?: number; duration?: number } }) => void
    destroy: () => void
  }
  YMapDefaultSchemeLayer: new (props: object) => YMapEntity
  YMapDefaultFeaturesLayer: new (props: object) => YMapEntity
  YMapMarker: new (props: { coordinates: LngLat }, element: HTMLElement) => YMapEntity & {
    update: (props: { coordinates: LngLat }) => void
  }
  YMapListener: new (props: {
    layer: string
    onClick: (object: unknown, event: { coordinates: LngLat }) => void
  }) => YMapEntity
  search: (options: { text: string; center?: LngLat }) => Promise<{ geometry?: { coordinates: LngLat } }[]>
}
type YMapEntity = { addChild?: (child: YMapEntity) => void }

declare global {
  interface Window {
    ymaps3?: YMaps
  }
}

/** Bryansk */
const defaultCenter: LngLat = [34.3633, 53.2434]

let loading: Promise<YMaps> | null = null

function loadYMaps() {
  loading ??= new Promise<YMaps>((resolve, reject) => {
    let script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(yandexMapsKey)}&lang=ru_RU`
    script.onload = () => window.ymaps3!.ready.then(() => resolve(window.ymaps3!), reject)
    script.onerror = reject
    document.head.append(script)
  })
  return loading
}

/** «53.243400, 34.363300» ↔ [lng, lat], the order of ymaps3 */
function parse(value: string): LngLat | null {
  let numbers = value.match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => parseFloat(n.replace(',', '.')))
  if (!numbers || numbers.length !== 2) return null
  let [lat, lng] = numbers
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lng, lat] : null
}

const format = ([lng, lat]: LngLat) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`

/**
 * Map for picking the point of a geolocation code: a click sets the
 * coordinates, typed coordinates move the marker, an address can be searched.
 */
export function YandexMap({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  let container = useRef<HTMLDivElement>(null)
  let api = useRef<{
    ymaps: YMaps
    map: InstanceType<YMaps['YMap']>
    marker: InstanceType<YMaps['YMapMarker']>
  } | null>(null)
  let [failed, setFailed] = useState(false)
  let [query, setQuery] = useState('')
  let [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadYMaps()
      .then((ymaps) => {
        if (cancelled || !container.current) return
        let start = parse(value) ?? defaultCenter
        let map = new ymaps.YMap(container.current, { location: { center: start, zoom: parse(value) ? 15 : 12 } })
        map.addChild!(new ymaps.YMapDefaultSchemeLayer({}))
        map.addChild!(new ymaps.YMapDefaultFeaturesLayer({}))
        let pin = document.createElement('div')
        pin.className = 'qr-map-pin'
        let marker = new ymaps.YMapMarker({ coordinates: start }, pin)
        map.addChild!(marker)
        map.addChild!(
          new ymaps.YMapListener({
            layer: 'any',
            onClick: (_, event) => {
              marker.update({ coordinates: event.coordinates })
              onChange(format(event.coordinates))
            },
          }),
        )
        api.current = { ymaps, map, marker }
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      api.current?.map.destroy()
      api.current = null
    }
    // The map is created once (onChange is a state setter); later values move the marker below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Typed coordinates move the marker
  useEffect(() => {
    let point = parse(value)
    if (!point || !api.current) return
    api.current.marker.update({ coordinates: point })
    api.current.map.update({ location: { center: point, duration: 300 } })
  }, [value])

  async function find(event: React.FormEvent) {
    event.preventDefault()
    if (!api.current || !query.trim()) return
    let results = await api.current.ymaps.search({ text: query, center: defaultCenter }).catch(() => [])
    let point = results[0]?.geometry?.coordinates
    setNotFound(!point)
    if (!point) return
    api.current.map.update({ location: { center: point, zoom: 16, duration: 300 } })
    api.current.marker.update({ coordinates: point })
    onChange(format(point))
  }

  if (failed) return null

  return (
    <div className="space-y-2">
      <form onSubmit={find} className="flex gap-2">
        <input
          type="search"
          placeholder="Адрес или место"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setNotFound(false)
          }}
          className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted"
        />
        <button
          type="submit"
          className="flex flex-none items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/70"
        >
          <MagnifyingGlassIcon className="size-4" />
          Найти
        </button>
      </form>
      {notFound && <p className="text-xs text-muted-foreground">Ничего не нашлось, попробуйте уточнить адрес</p>}
      <div ref={container} className={cn('aspect-4/3 w-full overflow-hidden rounded-lg bg-muted sm:aspect-video')} />
      <p className="text-xs text-muted-foreground">Нажмите на карту, чтобы поставить точку.</p>
    </div>
  )
}
