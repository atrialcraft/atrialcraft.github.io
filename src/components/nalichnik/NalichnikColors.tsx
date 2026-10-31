'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline'

import {
  colorName,
  colors,
  defaultScheme,
  presetColors,
  presets,
  readHash,
  wallColors,
  walls,
  writeHash,
  zones,
  type Scheme,
  type ZoneId,
} from '@/components/nalichnik/palette'
import { createScene, type NalichnikScene } from '@/components/nalichnik/scene'
import { cn } from '@/lib/utils'

const panelClass = 'rounded-2xl border border-border bg-card p-4 sm:p-6 dark:bg-muted/40'
const headingClass = 'text-sm font-semibold text-foreground'

const chipClass = (active: boolean) =>
  cn(
    'inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition',
    active ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-muted/60',
  )

function Dot({ hex }: { hex: string }) {
  return <span className="size-5 flex-none rounded-full ring-1 ring-foreground/20 ring-inset" style={{ background: `#${hex}` }} />
}

function Swatches({
  list,
  current,
  onPick,
}: {
  list: [string, string][]
  current: string
  onPick: (hex: string) => void
}) {
  let custom = !list.some(([hex]) => hex === current)
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
      {list.map(([hex, name]) => (
        <button
          key={hex}
          type="button"
          title={name}
          aria-label={name}
          aria-pressed={hex === current}
          onClick={() => onPick(hex)}
          className={cn(
            'aspect-square rounded-lg ring-1 ring-foreground/20 ring-inset transition',
            hex === current && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
          )}
          style={{ background: `#${hex}` }}
        />
      ))}
      <label
        title="Свой цвет"
        className={cn(
          'relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-[conic-gradient(#e74c3c,#f1c40f,#2ecc71,#3498db,#9b59b6,#e74c3c)] transition',
          custom && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
        )}
      >
        <span className="sr-only">Свой цвет</span>
        <input
          type="color"
          value={`#${current}`}
          onChange={(e) => onPick(e.target.value.slice(1).toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

export function NalichnikColors() {
  let viewer = useRef<HTMLDivElement>(null)
  let scene = useRef<NalichnikScene | null>(null)
  // Colours from a shared link; the component runs in the browser only
  let [scheme, setScheme] = useState<Scheme>(() => readHash(location.hash) ?? defaultScheme)
  let [selected, setSelected] = useState<ZoneId>('kokoshnik')
  let [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  let [tip, setTip] = useState<{ name: string; x: number; y: number } | null>(null)
  let [toast, setToast] = useState('')

  // A link with other colours opened on the same page
  useEffect(() => {
    let read = () => {
      let fromLink = readHash(location.hash)
      if (fromLink) setScheme(fromLink)
    }
    addEventListener('hashchange', read)
    return () => removeEventListener('hashchange', read)
  }, [])

  useEffect(() => {
    if (!viewer.current) return
    scene.current = createScene(viewer.current, {
      onLoad: () => setStatus('ready'),
      onError: () => setStatus('error'),
      onPick: setSelected,
      onHover: (id, x, y) => setTip(id ? { name: zones.find((z) => z.id === id)!.name, x, y } : null),
    })
    return () => {
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => {
    scene.current?.setColors(scheme.colors)
  }, [scheme.colors])

  useEffect(() => {
    scene.current?.setWall(scheme.wall, scheme.wallColor)
  }, [scheme.wall, scheme.wallColor])

  // The address follows the colours; Next keeps its own history state
  useEffect(() => {
    history.replaceState(history.state, '', `#${writeHash(scheme)}`)
  }, [scheme])

  useEffect(() => {
    if (!toast) return
    let timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  function choose(id: ZoneId) {
    setSelected(id)
    scene.current?.flash(id)
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(location.href)
      setToast('Ссылка скопирована — по ней откроются эти же цвета')
    } catch {
      setToast('Скопируйте адрес из строки браузера')
    }
  }

  async function download() {
    let blob = await scene.current?.snapshot()
    if (!blob) return
    let link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'nalichnik.png'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  let current = scheme.colors[selected]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      {/* Model */}
      {/* On phones it stays at the top while the colours are picked below */}
      <div className="sticky top-[calc(var(--banner-h,0px)+0.5rem)] z-10 lg:top-24">
        <div
          ref={viewer}
          className="relative h-[45dvh] overflow-hidden rounded-2xl bg-[#cfd8de] shadow-lg ring-1 ring-border sm:h-[55dvh] lg:h-[min(44rem,calc(100dvh-8rem))] lg:shadow-none"
        >
          {status !== 'ready' && (
            <div className="absolute inset-0 grid place-items-center text-sm font-medium text-[#3f3a33]">
              {status === 'loading' ? 'Загружаю наличник…' : 'Не получилось загрузить модель'}
            </div>
          )}
          {tip && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+0.875rem)] rounded-lg bg-[#111111]/85 px-2.5 py-1 text-xs whitespace-nowrap text-white"
              style={{ left: tip.x, top: tip.y }}
            >
              {tip.name}
            </div>
          )}
          <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-white/80 px-3 py-1.5 text-xs text-[#3f3a33] backdrop-blur-sm sm:block">
            Крутите мышью, колесо — приблизить, клик по детали — выбрать
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-6">
        <section className={panelClass}>
          <h2 className={headingClass}>Детали</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                aria-pressed={zone.id === selected}
                onClick={() => choose(zone.id)}
                className={chipClass(zone.id === selected)}
              >
                <Dot hex={scheme.colors[zone.id]} />
                {zone.name}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm font-medium text-foreground">
            {zones.find((z) => z.id === selected)!.name}{' '}
            <span className="font-normal text-muted-foreground">· {colorName(current)}</span>
          </p>
          <div className="mt-3">
            <Swatches
              list={colors}
              current={current}
              onPick={(hex) => setScheme((s) => ({ ...s, colors: { ...s.colors, [selected]: hex } }))}
            />
          </div>
        </section>

        <section className={panelClass}>
          <h2 className={headingClass}>Готовые сочетания</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              let schemeColors = presetColors(preset)
              let active = zones.every((z) => schemeColors[z.id] === scheme.colors[z.id])
              return (
                <button
                  key={preset[0]}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScheme((s) => ({ ...s, colors: schemeColors }))}
                  className={chipClass(active)}
                >
                  <span className="flex -space-x-1.5">
                    <Dot hex={preset[1]} />
                    <Dot hex={preset[2]} />
                    {preset[3] && <Dot hex={preset[3]} />}
                  </span>
                  {preset[0]}
                </button>
              )
            })}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className={headingClass}>Стена</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {walls.map((wall) => (
              <button
                key={wall.id}
                type="button"
                aria-pressed={wall.id === scheme.wall}
                onClick={() => setScheme((s) => ({ ...s, wall: wall.id, wallColor: wall.color }))}
                className={cn(chipClass(wall.id === scheme.wall), 'pl-3')}
              >
                {wall.name}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Swatches
              list={wallColors}
              current={scheme.wallColor}
              onPick={(hex) => setScheme((s) => ({ ...s, wallColor: hex }))}
            />
          </div>
        </section>

        <section className={panelClass}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button
              type="button"
              onClick={download}
              disabled={status !== 'ready'}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="size-4 flex-none" />
              Картинка
            </button>
            <button
              type="button"
              onClick={share}
              className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <LinkIcon className="size-4 flex-none" />
              Ссылка
            </button>
            <button
              type="button"
              onClick={() => setScheme(defaultScheme)}
              className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <ArrowPathIcon className="size-4 flex-none" />
              Сбросить
            </button>
          </div>
          <p className="mt-3 min-h-5 text-xs text-muted-foreground" aria-live="polite">
            {toast || 'Ссылка сохраняет все цвета: отправьте её, и у получателя откроется та же раскраска.'}
          </p>
        </section>
      </div>
    </div>
  )
}
