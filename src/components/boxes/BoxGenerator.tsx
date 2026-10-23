'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import {
  fingerCount,
  laserBox,
  laserBoxOuter,
  layout,
  toSvg,
  tray,
  trayWithLid,
  tuckEndBox,
  type Part,
} from '@/components/boxes/geometry'
import { cn } from '@/lib/utils'

type Family = 'laser' | 'cardboard'

const materials = [
  {
    id: 'plywood-3',
    label: 'Фанера 3 мм',
    family: 'laser',
    thickness: 3,
    kerf: 0.15,
  },
  {
    id: 'plywood-4',
    label: 'Фанера 4 мм',
    family: 'laser',
    thickness: 4,
    kerf: 0.15,
  },
  {
    id: 'plywood-6',
    label: 'Фанера 6 мм',
    family: 'laser',
    thickness: 6,
    kerf: 0.2,
  },
  { id: 'mdf-3', label: 'МДФ 3 мм', family: 'laser', thickness: 3, kerf: 0.15 },
  {
    id: 'acrylic-3',
    label: 'Акрил 3 мм',
    family: 'laser',
    thickness: 3,
    kerf: 0.1,
  },
  {
    id: 'cardboard-05',
    label: 'Картон 0,5 мм',
    family: 'cardboard',
    thickness: 0.5,
    kerf: 0,
  },
  {
    id: 'cardboard-15',
    label: 'Микрогофрокартон 1,5 мм',
    family: 'cardboard',
    thickness: 1.5,
    kerf: 0,
  },
  {
    id: 'cardboard-3',
    label: 'Гофрокартон 3 мм',
    family: 'cardboard',
    thickness: 3,
    kerf: 0,
  },
] as const

const boxTypes = [
  {
    id: 'closed',
    family: 'laser',
    label: 'Закрытая',
    hint: 'Шесть стенок на шипах',
  },
  {
    id: 'open',
    family: 'laser',
    label: 'Без крышки',
    hint: 'Пять стенок на шипах, открыта сверху',
  },
  {
    id: 'tuck',
    family: 'cardboard',
    label: 'С клапанами',
    hint: 'Складная коробка с крышками-клапанами сверху и снизу',
  },
  {
    id: 'tray',
    family: 'cardboard',
    label: 'Лоток',
    hint: 'Дно и четыре стенки, уголки вклеиваются внутрь',
  },
  {
    id: 'tray-lid',
    family: 'cardboard',
    label: 'Крышка-дно',
    hint: 'Лоток и надевающаяся сверху крышка',
  },
] as const

type BoxType = (typeof boxTypes)[number]['id']

type Settings = {
  material: string
  type: BoxType
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
  material: 'plywood-3',
  type: 'closed',
  length: 120,
  width: 80,
  height: 60,
  inner: true,
  thickness: 3,
  fingerWidth: 10,
  kerf: 0.15,
  lidHeight: 25,
}

const storageKey = 'atrial-boxes-settings'

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

const format = (n: number) =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className={cn(inputClass, 'mt-1')}
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        onChange={(event) => onChange(parseFloat(event.target.value))}
      />
      {hint && (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  )
}

/** What is wrong with the sizes, or null */
function problem(s: Settings): string | null {
  let values = [s.length, s.width, s.height, s.thickness]
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) {
    return 'Заполните размеры и толщину: числа больше нуля'
  }
  let family = materials.find((m) => m.id === s.material)?.family
  if (family === 'laser') {
    if (!(s.fingerWidth > 0)) return 'Ширина шипа должна быть больше нуля'
    if (!(s.kerf >= 0) || s.kerf > 1) return 'Пропил — от 0 до 1 мм'
    let outer = laserBoxOuter({ ...s, type: s.type as 'closed' | 'open' })
    let shortest = Math.min(outer.length, outer.width, outer.height)
    // The narrowest finger must stay wider than the material
    let segment = Math.min(
      ...[outer.length, outer.width, outer.height].map(
        (l) => l / fingerCount(l, s.fingerWidth),
      ),
    )
    if (shortest < 4 * s.thickness)
      return 'Коробка слишком мала для такой толщины'
    if (segment < s.thickness * 1.2) {
      return 'Шипы получаются тоньше материала: увеличьте ширину шипа'
    }
  } else if (s.type === 'tray-lid' && !(s.lidHeight > 0)) {
    return 'Укажите высоту крышки'
  }
  return null
}

function buildParts(s: Settings): Part[] {
  switch (s.type) {
    case 'closed':
    case 'open':
      return laserBox({ ...s, type: s.type })
    case 'tuck':
      return tuckEndBox(s)
    case 'tray':
      return tray(s)
    case 'tray-lid':
      return trayWithLid(s)
  }
}

export function BoxGenerator() {
  let [settings, setSettings] = useState<Settings>(defaults)

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

  let update = (patch: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...patch }))

  let material =
    materials.find((m) => m.id === settings.material) ?? materials[0]
  let family: Family = material.family
  let error = problem(settings)
  let parts = useMemo(
    () => (error ? [] : buildParts(settings)),
    [settings, error],
  )
  let sheet = parts.length ? layout(parts) : null

  function chooseMaterial(id: string) {
    let next = materials.find((m) => m.id === id)!
    let typeFits = boxTypes.some(
      (b) => b.id === settings.type && b.family === next.family,
    )
    update({
      material: id,
      thickness: next.thickness,
      kerf: next.kerf,
      fingerWidth: Math.max(8, next.thickness * 3),
      type: typeFits
        ? settings.type
        : next.family === 'laser'
          ? 'closed'
          : 'tuck',
    })
  }

  function download() {
    let blob = new Blob([toSvg(parts)], { type: 'image/svg+xml' })
    let link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `korobka-${settings.type}-${settings.length}x${settings.width}x${settings.height}.svg`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  let outer =
    family === 'laser'
      ? laserBoxOuter({ ...settings, type: settings.type as 'closed' | 'open' })
      : null

  return (
    <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Коробки
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Развёртки по размерам: на шипах для лазера или складные из картона.
          </p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Материал</span>
          <select
            className={cn(inputClass, 'mt-1')}
            value={settings.material}
            onChange={(event) => chooseMaterial(event.target.value)}
          >
            <optgroup label="Лазерная резка">
              {materials
                .filter((m) => m.family === 'laser')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Картон">
              {materials
                .filter((m) => m.family === 'cardboard')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            Вид коробки
          </legend>
          <div className="mt-1 grid gap-2">
            {boxTypes
              .filter((b) => b.family === family)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => update({ type: b.id })}
                  aria-pressed={settings.type === b.id}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left transition',
                    settings.type === b.id
                      ? 'border-foreground bg-muted'
                      : 'border-border hover:bg-muted/60',
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">
                    {b.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {b.hint}
                  </span>
                </button>
              ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Длина"
            value={settings.length}
            onChange={(length) => update({ length })}
          />
          <NumberField
            label="Ширина"
            value={settings.width}
            onChange={(width) => update({ width })}
          />
          <NumberField
            label="Высота"
            value={settings.height}
            onChange={(height) => update({ height })}
          />
        </div>

        {family === 'laser' ? (
          <div className="flex gap-2">
            {[
              { inner: true, label: 'Внутренние, мм' },
              { inner: false, label: 'Внешние, мм' },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => update({ inner: option.inner })}
                aria-pressed={settings.inner === option.inner}
                className={cn(
                  'flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition',
                  settings.inner === option.inner
                    ? 'border-foreground bg-muted text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/60',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Размеры внутренние, в миллиметрах. Толщина картона учтена в сгибах.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Толщина"
            value={settings.thickness}
            step={0.1}
            onChange={(thickness) => update({ thickness })}
          />
          {family === 'laser' && (
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
                hint="Детали расширятся на половину пропила, шипы сядут плотно"
              />
            </>
          )}
          {settings.type === 'tray-lid' && (
            <NumberField
              label="Высота крышки"
              value={settings.lidHeight}
              onChange={(lidHeight) => update({ lidHeight })}
            />
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-2xl border border-border bg-card p-4 dark:bg-muted/40">
          {error ? (
            <p className="py-24 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : (
            sheet && <Preview sheet={sheet} />
          )}
        </div>

        {sheet && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Лист: {format(sheet.width)} × {format(sheet.height)} мм,
                деталей: {parts.length}
              </p>
              {outer && (
                <p>
                  Снаружи: {format(outer.length)} × {format(outer.width)} ×{' '}
                  {format(outer.height)} мм
                </p>
              )}
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-5 bg-red-500" /> рез
                </span>
                {parts.some((p) => p.fold.length) && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-5 border-t-2 border-dashed border-blue-500" />{' '}
                    сгиб (отдельный слой, например рилёвка на малой мощности)
                  </span>
                )}
              </p>
            </div>
            <Button onClick={download}>
              <ArrowDownTrayIcon className="size-4" />
              Скачать SVG
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Preview({ sheet }: { sheet: ReturnType<typeof layout> }) {
  let margin = 2
  let w = sheet.width + 2 * margin
  let h = sheet.height + 2 * margin
  let fontSize = Math.max(4, Math.min(w, h) / 30)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto max-h-[70vh] w-full"
      role="img"
      aria-label="Развёртка коробки"
    >
      {sheet.placed.map((part, i) => (
        <g
          key={i}
          transform={`translate(${part.x + margin} ${part.y + margin})`}
        >
          {part.cut.map((d, j) => (
            <path
              key={j}
              d={d}
              className="fill-foreground/5 stroke-red-500"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {part.fold.map((d, j) => (
            <path
              key={j}
              d={d}
              fill="none"
              className="stroke-blue-500"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <text
            x={part.width / 2}
            y={part.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            className="fill-muted-foreground"
          >
            {part.name}
          </text>
        </g>
      ))}
    </svg>
  )
}
