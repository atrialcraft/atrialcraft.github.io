'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Bars3BottomLeftIcon,
  CalendarIcon,
  LinkIcon,
  MapPinIcon,
  NoSymbolIcon,
  UserIcon,
  WifiIcon,
} from '@heroicons/react/24/outline'

import {
  contactPayload,
  createQrSvg,
  eventPayload,
  geoPayload,
  linkPayload,
  mergedSvg,
  pngBlob,
  qrModules,
  recolorMark,
  wifiPayload,
  type Logo,
} from '@/components/qr/qr'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'link', label: 'Ссылка', icon: LinkIcon },
  { id: 'wifi', label: 'Wi-Fi', icon: WifiIcon },
  { id: 'contact', label: 'Визитка', icon: UserIcon },
  { id: 'text', label: 'Текст', icon: Bars3BottomLeftIcon },
  { id: 'event', label: 'Событие', icon: CalendarIcon },
  { id: 'geo', label: 'Место', icon: MapPinIcon },
] as const

type Tab = (typeof tabs)[number]['id']
type LogoChoice = 'atrial' | 'vk' | 'vk-blue' | 'none' | 'custom'

const colors = ['#000000', '#0077ff']

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

const panelClass = 'rounded-2xl border border-border bg-card p-4 sm:p-6 dark:bg-muted/40'

/** Shown while the fields are empty, so the page never looks blank */
const sample = 'https://atrial.org'

function Field({
  label,
  className,
  ...props
}: { label: string } & React.ComponentPropsWithoutRef<'input'>) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input className={cn(inputClass, 'mt-1')} {...props} />
    </label>
  )
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
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

function save(blob: Blob, name: string) {
  let link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export function QrGenerator() {
  let [tab, setTab] = useState<Tab>('link')
  let [url, setUrl] = useState('')
  let [utmOn, setUtmOn] = useState(false)
  let [utm, setUtm] = useState({ source: 'qr', medium: 'offline', campaign: '' })
  let [text, setText] = useState('')
  let [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false })
  let [contact, setContact] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', site: '' })
  let [event, setEvent] = useState({ title: '', start: '', end: '', place: '' })
  let [geo, setGeo] = useState({ lat: '', lng: '' })

  let [color, setColor] = useState(colors[0])
  let [background, setBackground] = useState(false)
  let [logoChoice, setLogoChoice] = useState<LogoChoice>('atrial')
  let [mark, setMark] = useState<string | null>(null)
  let [upload, setUpload] = useState<Logo | null>(null)
  let [sizeMm, setSizeMm] = useState(40)
  let [busy, setBusy] = useState(false)

  // The Atrial mark is the site icon itself
  useEffect(() => {
    fetch('/icon.svg')
      .then((response) => response.text())
      .then(setMark)
      .catch(() => {})
  }, [])

  let payload = {
    link: linkPayload(url, utmOn ? utm : undefined),
    text: text.trim() ? text : '',
    wifi: wifiPayload(wifi),
    contact: contactPayload(contact),
    event: eventPayload(event),
    geo: geoPayload(geo),
  }[tab]

  let logo: Logo =
    logoChoice === 'atrial'
      ? mark
        ? { kind: 'svg', svg: recolorMark(mark, color) }
        : { kind: 'none' }
      : logoChoice === 'custom'
        ? (upload ?? { kind: 'none' })
        : { kind: logoChoice }

  let design = { color, background, logo }
  let svg = useMemo(
    () => createQrSvg(payload || sample, design),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payload, color, background, logoChoice, mark, upload],
  )
  let modules = qrModules(svg)

  function chooseFile(file: File | undefined) {
    if (!file) return
    let reader = new FileReader()
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      reader.onload = () => setUpload({ kind: 'svg', svg: String(reader.result) })
      reader.readAsText(file)
    } else {
      reader.onload = () => setUpload({ kind: 'image', image: String(reader.result) })
      reader.readAsDataURL(file)
    }
    setLogoChoice('custom')
  }

  async function download(kind: 'svg' | 'png') {
    if (!payload || busy) return
    setBusy(true)
    try {
      if (kind === 'svg') {
        let markup = await mergedSvg(svg, design, sizeMm > 0 ? sizeMm : 40)
        save(new Blob([markup], { type: 'image/svg+xml' }), 'qr-code.svg')
      } else {
        save(await pngBlob(svg, 2048, background), 'qr-code.png')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-6">
        {/* What to encode */}
        <section className={panelClass}>
          <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition',
                  tab === id
                    ? 'bg-card text-foreground shadow-sm dark:bg-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4 flex-none" />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {tab === 'link' && (
              <>
                <Field
                  label="Адрес"
                  type="url"
                  inputMode="url"
                  placeholder="atrial.org"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={utmOn}
                    onChange={(e) => setUtmOn(e.target.checked)}
                    className="size-4 accent-foreground"
                  />
                  Добавить UTM-метки
                </label>
                {utmOn && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Источник" value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} />
                    <Field label="Канал" value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} />
                    <Field
                      label="Кампания"
                      placeholder="polka"
                      value={utm.campaign}
                      onChange={(e) => setUtm({ ...utm, campaign: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground sm:col-span-3">
                      В Яндекс Метрике переходы появятся в отчёте «Источники → Метки UTM».
                    </p>
                  </div>
                )}
              </>
            )}

            {tab === 'text' && (
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Текст</span>
                <textarea
                  rows={4}
                  className={cn(inputClass, 'mt-1 resize-y')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
            )}

            {tab === 'wifi' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Название сети" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
                  {wifi.security !== 'nopass' && (
                    <Field label="Пароль" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} />
                  )}
                </div>
                <Choice
                  options={[
                    { value: 'WPA', label: 'WPA/WPA2' },
                    { value: 'WEP', label: 'WEP' },
                    { value: 'nopass', label: 'Без пароля' },
                  ]}
                  value={wifi.security}
                  onChange={(security) => setWifi({ ...wifi, security })}
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={wifi.hidden}
                    onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
                    className="size-4 accent-foreground"
                  />
                  Скрытая сеть
                </label>
              </>
            )}

            {tab === 'contact' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Имя" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                <Field label="Фамилия" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                <Field
                  label="Телефон"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
                <Field
                  label="Почта"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
                <Field label="Компания" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                <Field label="Сайт" value={contact.site} onChange={(e) => setContact({ ...contact, site: e.target.value })} />
              </div>
            )}

            {tab === 'event' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Название"
                  className="sm:col-span-2"
                  value={event.title}
                  onChange={(e) => setEvent({ ...event, title: e.target.value })}
                />
                <Field
                  label="Начало"
                  type="datetime-local"
                  value={event.start}
                  onChange={(e) => setEvent({ ...event, start: e.target.value })}
                />
                <Field
                  label="Конец"
                  type="datetime-local"
                  value={event.end}
                  onChange={(e) => setEvent({ ...event, end: e.target.value })}
                />
                <Field
                  label="Место"
                  className="sm:col-span-2"
                  value={event.place}
                  onChange={(e) => setEvent({ ...event, place: e.target.value })}
                />
              </div>
            )}

            {tab === 'geo' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Широта"
                    inputMode="decimal"
                    placeholder="53.2434"
                    value={geo.lat}
                    onChange={(e) => setGeo({ ...geo, lat: e.target.value })}
                  />
                  <Field
                    label="Долгота"
                    inputMode="decimal"
                    placeholder="34.3633"
                    value={geo.lng}
                    onChange={(e) => setGeo({ ...geo, lng: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Координаты можно скопировать в Яндекс Картах: нажмите на точку, они появятся в карточке места.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Look */}
        <section className={panelClass}>
          <h2 className="text-sm font-semibold text-foreground">Внешний вид</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Цвет</span>
              <div className="mt-2 flex items-center gap-2">
                {colors.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(value)}
                    aria-label={value}
                    aria-pressed={color === value}
                    className={cn(
                      'size-8 rounded-full ring-offset-2 ring-offset-card transition',
                      color === value ? 'ring-2 ring-foreground' : 'ring-1 ring-border',
                    )}
                    style={{ background: value }}
                  />
                ))}
                <label
                  className={cn(
                    'relative size-8 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] ring-offset-2 ring-offset-card transition',
                    !colors.includes(color) ? 'ring-2 ring-foreground' : 'ring-1 ring-border',
                  )}
                >
                  <span className="sr-only">Свой цвет</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Фон</span>
              <div className="mt-2">
                <Choice
                  options={[
                    { value: 'none', label: 'Только код' },
                    { value: 'white', label: 'Белая подложка' },
                  ]}
                  value={background ? 'white' : 'none'}
                  onChange={(value) => setBackground(value === 'white')}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <span className="text-xs font-medium text-muted-foreground">Логотип в центре</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <LogoButton label="Без логотипа" active={logoChoice === 'none'} onClick={() => setLogoChoice('none')}>
                <NoSymbolIcon className="size-6 text-muted-foreground" />
              </LogoButton>
              <LogoButton label="Atrial" active={logoChoice === 'atrial'} onClick={() => setLogoChoice('atrial')}>
                <img src="/icon.svg" alt="" className="size-7" />
              </LogoButton>
              <LogoButton label="ВКонтакте" active={logoChoice === 'vk'} onClick={() => setLogoChoice('vk')}>
                <VkLogo className="size-7" color="#000000" />
              </LogoButton>
              <LogoButton label="ВКонтакте, синий" active={logoChoice === 'vk-blue'} onClick={() => setLogoChoice('vk-blue')}>
                <VkLogo className="size-7" color="#0077ff" />
              </LogoButton>
              <label
                className={cn(
                  'flex size-14 cursor-pointer items-center justify-center rounded-lg border border-dashed transition',
                  logoChoice === 'custom' ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60',
                )}
                title="Свой логотип: SVG, PNG или JPEG"
              >
                <span className="sr-only">Загрузить свой логотип</span>
                <ArrowUpTrayIcon className="size-6 text-muted-foreground" />
                <input
                  type="file"
                  accept=".svg,image/svg+xml,image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => chooseFile(e.target.files?.[0])}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Свой логотип лучше загружать в SVG: тогда в файле для лазера он тоже будет контуром.
            </p>
          </div>
        </section>
      </div>

      {/* Preview and files */}
      <aside className={cn(panelClass, 'lg:sticky lg:top-24')}>
        <div
          className={cn(
            'mx-auto aspect-square w-full max-w-72 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition [&>svg]:size-full',
            !payload && 'opacity-40',
          )}
          role="img"
          aria-label="QR-код"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {payload && modules > 49 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            Код получился плотным: печатайте его крупнее или сократите содержимое.
          </p>
        )}
        {!payload && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Заполните поля слева</p>
        )}

        <label className="mt-5 block">
          <span className="text-xs font-medium text-muted-foreground">Размер SVG</span>
          <span className="relative mt-1 block">
            <input
              type="number"
              inputMode="decimal"
              min={5}
              className={cn(inputClass, 'pr-10')}
              value={Number.isFinite(sizeMm) ? sizeMm : ''}
              onChange={(e) => setSizeMm(parseFloat(e.target.value))}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              мм
            </span>
          </span>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['svg', 'png'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={!payload || busy}
              onClick={() => download(kind)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="size-4" />
              {kind.toUpperCase()}
            </button>
          ))}
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>SVG — векторный, сразу одним контуром: LightBurn и Illustrator открывают его без объединения.</li>
          <li>PNG — 2048 × 2048 пикселей, для мессенджеров и макетов.</li>
          <li>Перед печатью проверьте код камерой телефона.</li>
        </ul>
      </aside>
    </div>
  )
}

function LogoButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex size-14 items-center justify-center rounded-lg border transition',
        active ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60',
      )}
    >
      <span className="sr-only">{label}</span>
      {children}
    </button>
  )
}

/** The same VK logo the library puts into the code */
function VkLogo({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="83 83 584 584" className={className} aria-hidden="true">
      <path
        fill={color}
        d="M83.3334 363.333C83.3334 231.34 83.3334 165.343 124.338 124.338C165.343 83.3333 231.34 83.3333 363.333 83.3333H386.667C518.66 83.3333 584.657 83.3333 625.662 124.338C666.667 165.343 666.667 231.34 666.667 363.333V386.667C666.667 518.66 666.667 584.657 625.662 625.662C584.657 666.667 518.66 666.667 386.667 666.667H363.333C231.34 666.667 165.343 666.667 124.338 625.662C83.3334 584.657 83.3334 518.66 83.3334 386.667V363.333Z"
      />
      <path
        fill="#fff"
        d="M394.907 508.681C263.293 508.681 183.442 417.365 180.313 265.625H246.972C249.05 377.09 299.763 424.323 338.638 434.036V265.625H402.519V361.82C440.016 357.664 479.264 313.909 492.456 265.625H555.333C545.27 325 502.543 368.754 472.353 386.803C502.566 401.395 551.177 439.593 569.926 508.681H500.815C486.222 462.498 450.476 426.728 402.542 421.872V508.681H394.907Z"
      />
    </svg>
  )
}
