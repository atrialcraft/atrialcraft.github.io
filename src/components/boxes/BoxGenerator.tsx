'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  CubeIcon,
  PauseIcon,
  PlayIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'

import { Box3D, renderThumbnail } from '@/components/boxes/Box3D'
import {
  cardboardDesign,
  fingerCount,
  laserBox,
  laserOuter,
  layout,
  mailerNet,
  polyline,
  toDxf,
  toSvg,
  trayNets,
  trayWithLidNets,
  tuckEndNet,
  type Design,
} from '@/components/boxes/geometry'
import { cn } from '@/lib/utils'

type Family = 'laser' | 'cardboard'

type Material = {
  id: string
  label: string
  family: Family
  thickness: number
  kerf: number
  color: string
  transparent?: boolean
}

const materials: Material[] = [
  { id: 'plywood-3', label: 'Фанера 3 мм', family: 'laser', thickness: 3, kerf: 0.15, color: '#dcbc8f' },
  { id: 'plywood-4', label: 'Фанера 4 мм', family: 'laser', thickness: 4, kerf: 0.15, color: '#dcbc8f' },
  { id: 'plywood-6', label: 'Фанера 6 мм', family: 'laser', thickness: 6, kerf: 0.2, color: '#dcbc8f' },
  { id: 'mdf-3', label: 'МДФ 3 мм', family: 'laser', thickness: 3, kerf: 0.15, color: '#a07c58' },
  { id: 'acrylic-3', label: 'Акрил 3 мм', family: 'laser', thickness: 3, kerf: 0.1, color: '#a9d8ec', transparent: true },
  { id: 'cardboard-05', label: 'Картон 0,5 мм', family: 'cardboard', thickness: 0.5, kerf: 0, color: '#f1ede4' },
  { id: 'cardboard-15', label: 'Микрогофрокартон 1,5 мм', family: 'cardboard', thickness: 1.5, kerf: 0, color: '#c8a072' },
  { id: 'cardboard-3', label: 'Гофрокартон 3 мм', family: 'cardboard', thickness: 3, kerf: 0, color: '#c39a6b' },
]

const models = [
  { id: 'mailer', family: 'cardboard', name: 'Почтовая коробка', hint: 'Самосборная, крышка заправляется', material: 'cardboard-15' },
  { id: 'tuck', family: 'cardboard', name: 'Коробка с клапанами', hint: 'Складная, клапаны сверху и снизу', material: 'cardboard-05' },
  { id: 'tray', family: 'cardboard', name: 'Лоток', hint: 'Дно и четыре стенки', material: 'cardboard-15' },
  { id: 'tray-lid', family: 'cardboard', name: 'Крышка-дно', hint: 'Лоток и надевающаяся крышка', material: 'cardboard-15' },
  { id: 'laser-closed', family: 'laser', name: 'Шкатулка на шипах', hint: 'Шесть стенок, лазер', material: 'plywood-3' },
  { id: 'laser-open', family: 'laser', name: 'Короб без крышки', hint: 'Пять стенок на шипах, лазер', material: 'plywood-3' },
] as const

type ModelId = (typeof models)[number]['id']

type Settings = {
  model: ModelId
  material: string
  length: number
  width: number
  height: number
  inner: boolean
  thickness: number
  fingerWidth: number
  kerf: number
  lidHeight: number
}

const defaults: Settings = {
  model: 'mailer',
  material: 'cardboard-15',
  length: 200,
  width: 150,
  height: 60,
  inner: true,
  thickness: 1.5,
  fingerWidth: 10,
  kerf: 0.15,
  lidHeight: 25,
}

const storageKey = 'atrial-boxes-settings-v2'

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

const format = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })

/** How much bigger a cardboard box is outside than inside */
function outerExtra(model: ModelId, t: number): [number, number, number] {
  switch (model) {
    case 'mailer':
      return [4 * t, 2 * t, 2 * t]
    case 'tuck':
      return [2 * t, 2 * t, 2 * t]
    case 'tray':
      return [2 * t, 2 * t, t]
    case 'tray-lid':
      return [4 * t + 1, 4 * t + 1, t]
    default:
      return [0, 0, 0]
  }
}

/** What is wrong with the sizes, or null */
function problem(s: Settings, family: Family): string | null {
  let values = [s.length, s.width, s.height, s.thickness]
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) {
    return 'Заполните размеры и толщину: числа больше нуля'
  }
  if (family === 'laser') {
    if (!(s.fingerWidth > 0)) return 'Ширина шипа должна быть больше нуля'
    if (!(s.kerf >= 0) || s.kerf > 1) return 'Пропил — от 0 до 1 мм'
    let outer = laserOuter({ ...s, closed: s.model === 'laser-closed' })
    if (Math.min(...outer) < 4 * s.thickness) return 'Коробка слишком мала для такой толщины'
    let segment = Math.min(...outer.map((l) => l / fingerCount(l, s.fingerWidth)))
    if (segment < s.thickness * 1.2) return 'Шипы получаются тоньше материала: увеличьте ширину шипа'
    return null
  }
  let extra = outerExtra(s.model, s.thickness)
  let inside = s.inner
    ? [s.length, s.width, s.height]
    : [s.length - extra[0], s.width - extra[1], s.height - extra[2]]
  if (Math.min(...inside) < 6 * s.thickness) return 'Коробка слишком мала для такой толщины картона'
  if (s.model === 'tray-lid' && !(s.lidHeight > 0)) return 'Укажите высоту крышки'
  return null
}

function buildDesign(s: Settings): Design {
  if (s.model === 'laser-closed' || s.model === 'laser-open') {
    return laserBox({ ...s, closed: s.model === 'laser-closed' })
  }
  let extra = outerExtra(s.model, s.thickness)
  let size = s.inner
    ? [s.length, s.width, s.height]
    : [s.length - extra[0], s.width - extra[1], s.height - extra[2]]
  let o = {
    length: Math.round(size[0] * 10) / 10,
    width: Math.round(size[1] * 10) / 10,
    height: Math.round(size[2] * 10) / 10,
    thickness: s.thickness,
  }
  let outer: [number, number, number] = [o.length + extra[0], o.width + extra[1], o.height + extra[2]]
  switch (s.model) {
    case 'mailer':
      return cardboardDesign([mailerNet(o)], o, outer)
    case 'tuck':
      return cardboardDesign([tuckEndNet(o)], o, outer)
    case 'tray':
      return cardboardDesign(trayNets(o), o, outer)
    case 'tray-lid':
      return cardboardDesign(trayWithLidNets({ ...o, lidHeight: s.lidHeight }), o, outer)
  }
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="relative mt-1 block">
        <input
          type="number"
          inputMode="decimal"
          className={cn(inputClass, 'pr-10')}
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={0}
          onChange={(event) => onChange(parseFloat(event.target.value))}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          мм
        </span>
      </span>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Toggle<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-md border px-3 py-2 text-xs font-medium transition',
            value === option.value
              ? 'border-foreground bg-muted text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted/60',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const tabs = [
  { id: 'models', label: 'Модели', icon: Squares2X2Icon },
  { id: 'size', label: 'Размеры', icon: CubeIcon },
  { id: 'advanced', label: 'Ещё', icon: AdjustmentsHorizontalIcon },
] as const

export function BoxGenerator() {
  let [settings, setSettings] = useState<Settings>(defaults)
  let [tab, setTab] = useState<(typeof tabs)[number]['id']>('models')
  let [fold, setFold] = useState(1)
  let [playing, setPlaying] = useState(false)
  let [thumbs, setThumbs] = useState<Record<string, string>>({})

  // Last settings are kept in this browser only
  useEffect(() => {
    try {
      let saved = localStorage.getItem(storageKey)
      if (saved) setSettings({ ...defaults, ...JSON.parse(saved) })
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch {}
  }, [settings])

  // Gallery pictures: every model assembled, in its usual material
  useEffect(() => {
    let pictures: Record<string, string> = {}
    for (let model of models) {
      let m = materials.find((x) => x.id === model.material)!
      let s: Settings = {
        ...defaults,
        model: model.id,
        material: m.id,
        thickness: m.thickness,
        height: model.family === 'laser' ? 80 : 60,
      }
      try {
        pictures[model.id] = renderThumbnail(buildDesign(s), m.color, m.transparent)
      } catch {}
    }
    setThumbs(pictures)
  }, [])

  // Folding animation: closes, opens, closes…
  useEffect(() => {
    if (!playing) return
    let direction = 1
    let last = performance.now()
    let id = 0
    let step = (now: number) => {
      let dt = now - last
      last = now
      setFold((current) => {
        let next = current + (direction * dt) / 2500
        if (next >= 1) {
          direction = -1
          return 1
        }
        if (next <= 0) {
          direction = 1
          return 0
        }
        return next
      })
      id = requestAnimationFrame(step)
    }
    setFold((current) => {
      direction = current >= 1 ? -1 : 1
      return current
    })
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [playing])

  let update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }))

  let model = models.find((m) => m.id === settings.model) ?? models[0]
  let family: Family = model.family
  let material =
    materials.find((m) => m.id === settings.material && m.family === family) ??
    materials.find((m) => m.id === model.material)!
  let error = problem(settings, family)
  let design = useMemo(() => (error ? null : buildDesign(settings)), [settings, error])
  let sheet = design ? layout(design.parts) : null

  function chooseModel(id: ModelId) {
    let next = models.find((m) => m.id === id)!
    let keep = materials.find((m) => m.id === settings.material)?.family === next.family
    let m = keep ? material : materials.find((x) => x.id === next.material)!
    update({ model: id, material: m.id, thickness: m.thickness, kerf: m.kerf })
    setFold(1)
  }

  function chooseMaterial(id: string) {
    let m = materials.find((x) => x.id === id)!
    update({
      material: m.id,
      thickness: m.thickness,
      kerf: m.kerf,
      fingerWidth: Math.max(8, m.thickness * 3),
    })
  }

  function download(kind: 'svg' | 'dxf') {
    if (!design) return
    let text = kind === 'svg' ? toSvg(design.parts) : toDxf(design.parts)
    let blob = new Blob([text], { type: kind === 'svg' ? 'image/svg+xml' : 'application/dxf' })
    let link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `korobka-${settings.model}-${settings.length}x${settings.width}x${settings.height}.${kind}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
      {/* Settings */}
      <aside className="rounded-2xl border border-border bg-card p-4 lg:row-span-2 xl:row-span-1 dark:bg-muted/40">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Коробки</h1>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md py-1.5 text-xs font-medium transition',
                tab === id
                  ? 'bg-card text-foreground shadow-sm dark:bg-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'models' && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => chooseModel(m.id)}
                aria-pressed={settings.model === m.id}
                className={cn(
                  'rounded-lg border p-1.5 text-left transition',
                  settings.model === m.id ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60',
                )}
              >
                <span className="block aspect-4/3 overflow-hidden rounded-md bg-muted/60">
                  {thumbs[m.id] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[m.id]} alt="" className="size-full object-contain" />
                  )}
                </span>
                <span className="mt-1.5 block text-xs leading-4 font-medium text-foreground">{m.name}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-4 text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'size' && (
          <div className="mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Длина" value={settings.length} onChange={(length) => update({ length })} />
              <NumberField label="Ширина" value={settings.width} onChange={(width) => update({ width })} />
              <NumberField label="Высота" value={settings.height} onChange={(height) => update({ height })} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Размеры</span>
              <div className="mt-1">
                <Toggle
                  options={[
                    { value: true, label: 'Внутренние' },
                    { value: false, label: 'Внешние' },
                  ]}
                  value={settings.inner}
                  onChange={(inner) => update({ inner })}
                />
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Материал</span>
              <select
                className={cn(inputClass, 'mt-1')}
                value={material.id}
                onChange={(event) => chooseMaterial(event.target.value)}
              >
                {materials
                  .filter((m) => m.family === family)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </label>
            <NumberField
              label="Толщина"
              value={settings.thickness}
              step={0.1}
              onChange={(thickness) => update({ thickness })}
            />
          </div>
        )}

        {tab === 'advanced' && (
          <div className="mt-4 space-y-4">
            {family === 'laser' ? (
              <>
                <NumberField
                  label="Ширина шипа"
                  value={settings.fingerWidth}
                  onChange={(fingerWidth) => update({ fingerWidth })}
                />
                <NumberField
                  label="Пропил лазера"
                  value={settings.kerf}
                  step={0.01}
                  onChange={(kerf) => update({ kerf })}
                  hint="Детали расширяются на половину пропила, чтобы шипы сели плотно"
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Сгибы в файле — отдельный синий слой: их можно рилевать на малой мощности
                лазера или продавливать на плоттере.
              </p>
            )}
            {settings.model === 'tray-lid' && (
              <NumberField
                label="Высота крышки"
                value={settings.lidHeight}
                onChange={(lidHeight) => update({ lidHeight })}
              />
            )}
          </div>
        )}
      </aside>

      {/* Dieline */}
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 dark:bg-muted/40">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-red-500" /> рез
            </span>
            {design?.parts.some((p) => p.fold.length) && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-blue-500" /> сгиб
              </span>
            )}
          </div>
          {design && sheet && (
            <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
              <dt>Внутри</dt>
              <dd className="text-foreground">{design.inner.map(format).join(' × ')} мм</dd>
              <dt>Снаружи</dt>
              <dd className="text-foreground">{design.outer.map(format).join(' × ')} мм</dd>
              <dt>Лист</dt>
              <dd className="text-foreground">
                {format(sheet.width)} × {format(sheet.height)} мм
              </dd>
            </dl>
          )}
        </div>
        <div className="mt-4">
          {error || !sheet ? (
            <p className="py-24 text-center text-sm text-muted-foreground">{error}</p>
          ) : (
            <Dieline sheet={sheet} />
          )}
        </div>
      </section>

      {/* 3D and files */}
      <aside className="space-y-4 lg:col-start-2 xl:col-start-3 xl:row-start-1">
        <div className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-muted/30 to-muted dark:from-muted/20 dark:to-muted/60">
          <div className="aspect-square">
            {design && (
              <Box3D design={design} color={material.color} transparent={material.transparent} t={fold} />
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-card/70 px-3 py-2 dark:bg-muted/40">
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Остановить' : 'Показать сборку'}
              className="flex size-8 flex-none items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/70"
            >
              {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
            </button>
            <span className="text-xs text-muted-foreground">Открыто</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={fold}
              onChange={(event) => {
                setPlaying(false)
                setFold(parseFloat(event.target.value))
              }}
              className="min-w-0 flex-1 accent-foreground"
              aria-label="Сборка коробки"
            />
            <span className="text-xs text-muted-foreground">Закрыто</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 dark:bg-muted/40">
          <h2 className="text-sm font-semibold text-foreground">Скачать развёртку</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['svg', 'dxf'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={!design}
                onClick={() => download(kind)}
                className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <ArrowDownTrayIcon className="size-4" />
                {kind.toUpperCase()}
              </button>
            ))}
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Миллиметры, масштаб 1 : 1.</li>
            <li>Рез — красный, сгиб — синий: в LightBurn это разные слои.</li>
            <li>SVG — для LightBurn и Illustrator, DXF — для CorelDRAW и AutoCAD.</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

function Dieline({ sheet }: { sheet: ReturnType<typeof layout> }) {
  let margin = Math.max(sheet.width, sheet.height) * 0.04
  let w = sheet.width + 2 * margin
  let h = sheet.height + 2 * margin
  let font = Math.max(4, Math.max(w, h) / 55)
  return (
    <svg
      viewBox={`${-margin} ${-margin} ${w} ${h}`}
      className="h-auto max-h-[75vh] w-full"
      role="img"
      aria-label="Развёртка коробки"
    >
      <defs>
        <marker
          id="dim-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 1 L10 5 L0 9" fill="none" className="stroke-blue-500" strokeWidth="1.5" />
        </marker>
      </defs>
      {sheet.placed.map((part, i) => (
        <g key={i} transform={`translate(${part.x} ${part.y})`}>
          {part.cut.map((line, j) => (
            <path
              key={j}
              d={polyline(line)}
              fill="none"
              className="stroke-red-500"
              strokeWidth={1.2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {part.fold.map((line, j) => (
            <path
              key={j}
              d={polyline(line)}
              fill="none"
              className="stroke-blue-500"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {part.dims.map((d, j) => (
            <g key={`d${j}`}>
              <line
                x1={d.from[0]}
                y1={d.from[1]}
                x2={d.to[0]}
                y2={d.to[1]}
                className="stroke-blue-500/70"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                markerStart="url(#dim-arrow)"
                markerEnd="url(#dim-arrow)"
              />
              <text
                x={(d.from[0] + d.to[0]) / 2}
                y={(d.from[1] + d.to[1]) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={font}
                className="fill-blue-600 stroke-card dark:fill-blue-400"
                strokeWidth={font * 0.35}
                paintOrder="stroke"
              >
                {d.label} мм
              </text>
            </g>
          ))}
          {sheet.placed.length > 1 && (
            <text
              x={part.width * (part.dims.length ? 0.35 : 0.5)}
              y={part.height * (part.dims.length ? 0.65 : 0.5)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={font}
              className="fill-muted-foreground"
            >
              {part.name}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
