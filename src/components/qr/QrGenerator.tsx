'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Bars3BottomLeftIcon,
  CalendarIcon,
  CameraIcon,
  LinkIcon,
  MapPinIcon,
  NoSymbolIcon,
  UserIcon,
  WifiIcon,
} from '@heroicons/react/24/outline'

import {
  brandColors,
  codeColor,
  compose,
  isLight,
  nestedCode,
  svgDocument,
  type Fonts,
  type Frame,
  type Look,
} from '@/components/qr/layout'
import {
  contactPayload,
  createQrSvg,
  eventPayload,
  geoPayload,
  linkPayload,
  mergedCode,
  pngBlob,
  qrModules,
  wifiPayload,
  type Logo,
} from '@/components/qr/qr'
import { qrMarkPath, qrMarkSvg } from '@/components/qr/mark'
import { cn } from '@/lib/utils'

const tabs = [
  {
    id: 'link',
    label: 'Ссылка',
    icon: LinkIcon,
    about: [
      'Введите адрес — QR-код появится справа. Сохраните его в PNG для соцсетей и макетов или в SVG для печати и лазера.',
      'Покупателю не придётся набирать адрес вручную: достаточно навести камеру телефона на код на упаковке, ценнике или витрине.',
    ],
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    icon: WifiIcon,
    about: [
      'Гостям не придётся искать пароль от сети и вводить его по буквам. Укажите название сети и пароль — телефон подключится, когда отсканирует код.',
      'Повесьте код у входа, на стойке или на столиках.',
    ],
  },
  {
    id: 'contact',
    label: 'Визитка',
    icon: UserIcon,
    about: [
      'Зашифруйте в QR-коде свои контакты: имя, должность, телефон, почту. После сканирования телефон предложит сохранить их в записную книжку.',
      'Такую визитку не потеряют — её можно напечатать на обороте обычной или поставить на прилавок.',
    ],
  },
  {
    id: 'text',
    label: 'Текст',
    icon: Bars3BottomLeftIcon,
    about: [
      'В QR-код можно уложить короткий текст: инструкцию, состав, историю вещи. Телефон покажет его сразу после сканирования, интернет не нужен.',
      'Удобно, когда на упаковке или бирке мало места.',
    ],
  },
  {
    id: 'event',
    label: 'Событие',
    icon: CalendarIcon,
    about: [
      'Укажите название, дату и время — после сканирования телефон предложит добавить событие в календарь.',
      'Подходит для афиш мастер-классов, ярмарок и встреч.',
    ],
  },
  {
    id: 'geo',
    label: 'Геолокация',
    icon: MapPinIcon,
    about: [
      'Зашифруйте координаты мастерской, магазина или места встречи — телефон откроет их на карте и предложит проложить маршрут.',
    ],
  },
] as const

type Tab = (typeof tabs)[number]['id']

const frames: { value: Frame; label: string }[] = [
  { value: 'code', label: 'Только код' },
  { value: 'frame', label: 'С рамкой' },
  { value: 'background', label: 'С фоном' },
  { value: 'card', label: 'Карточка' },
]

const labels = [
  'Наведите камеру телефона',
  'Отсканируйте QR-код',
  'Подробнее по ссылке',
  'Подключиться к Wi-Fi',
  'Сохранить контакт',
]
const customLabel = 'custom'
const labelLimit = 28
const titleLimit = 18
const subtitleLimit = 30

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

const panelClass = 'rounded-2xl border border-border bg-card p-4 sm:p-6 dark:bg-muted/40'

/** Shown while the fields are empty, so the preview is never blank */
const sample = 'https://atrial.org'

function Field({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & React.ComponentPropsWithoutRef<'input'>) {
  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input className={cn(inputClass, 'mt-1.5')} {...props} />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Radios<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="size-4 accent-foreground"
          />
          {option.label}
        </label>
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

function readFile(file: File, as: 'text' | 'data') {
  return new Promise<string>((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    if (as === 'text') reader.readAsText(file)
    else reader.readAsDataURL(file)
  })
}

export function QrGenerator() {
  let [tab, setTab] = useState<Tab>('link')
  let [url, setUrl] = useState('')
  let [utmOn, setUtmOn] = useState(false)
  let [utm, setUtm] = useState({ source: 'qr', medium: 'offline', campaign: '' })
  let [text, setText] = useState('')
  let [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass', hidden: false })
  let [contact, setContact] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    position: '',
    company: '',
    phone: '',
    email: '',
    site: '',
  })
  let [event, setEvent] = useState({ title: '', start: '', end: '', place: '', url: '' })
  let [coordinates, setCoordinates] = useState('')

  let [frame, setFrame] = useState<Frame>('code')
  let [color, setColor] = useState(brandColors[0])
  let [labelChoice, setLabelChoice] = useState(labels[0])
  let [ownLabel, setOwnLabel] = useState('')
  let [title, setTitle] = useState('')
  let [subtitle, setSubtitle] = useState('')
  let [photo, setPhoto] = useState<string | null>(null)
  let [logoChoice, setLogoChoice] = useState<'atrial' | 'none' | 'custom'>('atrial')
  let [upload, setUpload] = useState<Logo | null>(null)

  let [fonts, setFonts] = useState<Fonts | null>(null)
  let [widthMm, setWidthMm] = useState(40)
  let [busy, setBusy] = useState(false)

  // The fonts outline the captions
  useEffect(() => {
    Promise.all([
      import('opentype.js'),
      fetch('/fonts/golos-text-400.ttf').then((r) => r.arrayBuffer()),
      fetch('/fonts/golos-text-700.ttf').then((r) => r.arrayBuffer()),
    ])
      .then(([opentype, regular, bold]) => setFonts({ regular: opentype.parse(regular), bold: opentype.parse(bold) }))
      .catch(() => {})
  }, [])

  let payload = {
    link: linkPayload(url, utmOn ? utm : undefined),
    text: text.trim() ? text : '',
    wifi: wifiPayload(wifi),
    contact: contactPayload(contact),
    event: eventPayload(event),
    geo: geoPayload(coordinates),
  }[tab]

  let look: Look = {
    frame,
    color,
    label: labelChoice === customLabel ? ownLabel : labelChoice,
    title,
    subtitle,
    photo,
  }
  let ink = codeColor(look)

  let logo: Logo =
    logoChoice === 'atrial'
      ? { kind: 'svg', svg: qrMarkSvg(ink) }
      : logoChoice === 'custom'
        ? (upload ?? { kind: 'none' })
        : { kind: 'none' }

  let code = useMemo(
    () => createQrSvg(payload || sample, { color: ink, logo }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payload, ink, logoChoice, upload],
  )
  let composition = compose(look, nestedCode(code), fonts)
  let preview = svgDocument(composition, 'class="h-auto w-full" role="img" aria-label="QR-код"')
  let modules = qrModules(code)
  // A light code on its own needs a dark backdrop to be seen
  let darkBackdrop = frame === 'code' && isLight(ink)

  async function chooseLogo(file: File | undefined) {
    if (!file) return
    let svg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    setUpload(svg ? { kind: 'svg', svg: await readFile(file, 'text') } : { kind: 'image', image: await readFile(file, 'data') })
    setLogoChoice('custom')
  }

  async function choosePhoto(file: File | undefined) {
    if (!file || file.size > 5 * 1024 * 1024) return
    setPhoto(await readFile(file, 'data'))
  }

  async function download(kind: 'svg' | 'png') {
    if (!payload || busy) return
    setBusy(true)
    try {
      if (kind === 'svg') {
        let c = compose(look, await mergedCode(code, ink), fonts)
        let width = widthMm > 0 ? widthMm : 40
        let height = Math.round((width * c.height * 100) / c.width) / 100
        let file = `<?xml version="1.0" encoding="UTF-8"?>\n${svgDocument(c, `width="${width}mm" height="${height}mm"`)}\n`
        save(new Blob([file], { type: 'image/svg+xml' }), 'qr-code.svg')
      } else {
        // The bare code gets a quiet zone on white: scanners need the margin,
        // and a transparent code turns black on black in a dark chat
        let c = composition
        let pad = frame === 'code' ? 16 : 0
        let width = 2048
        let height = Math.round((width * (c.height + 2 * pad)) / (c.width + 2 * pad))
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${-pad} ${-pad} ${c.width + 2 * pad} ${c.height + 2 * pad}" width="${width}" height="${height}">${c.body}</svg>`
        let background = frame === 'code' && !isLight(ink) ? '#ffffff' : null
        save(await pngBlob(svg, width, height, background), 'qr-code.png')
      }
    } finally {
      setBusy(false)
    }
  }

  let current = tabs.find((t) => t.id === tab)!

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

          <div className="mt-5 space-y-3 border-b border-border pb-5 text-sm text-muted-foreground">
            {current.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {tab === 'link' && (
              <>
                <Field
                  label="Адрес"
                  type="url"
                  inputMode="url"
                  placeholder="Введите адрес"
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
                      Переходы по коду появятся в Яндекс Метрике, в отчёте «Источники → Метки UTM».
                    </p>
                  </div>
                )}
              </>
            )}

            {tab === 'wifi' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Имя сети" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
                  {wifi.security !== 'nopass' && (
                    <Field label="Пароль" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Тип шифрования</span>
                  <div className="mt-2">
                    <Radios
                      name="security"
                      options={[
                        { value: 'WPA', label: 'WPA/WPA2' },
                        { value: 'WEP', label: 'WEP' },
                        { value: 'nopass', label: 'Без шифрования' },
                      ]}
                      value={wifi.security}
                      onChange={(security) => setWifi({ ...wifi, security })}
                    />
                  </div>
                </div>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Фамилия" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                <Field label="Имя" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                <Field
                  label="Отчество"
                  value={contact.middleName}
                  onChange={(e) => setContact({ ...contact, middleName: e.target.value })}
                />
                <Field label="Должность" value={contact.position} onChange={(e) => setContact({ ...contact, position: e.target.value })} />
                <Field label="Компания" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                <Field
                  label="Номер телефона"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
                <Field
                  label="E-mail"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
                <Field label="Сайт или соцсеть" value={contact.site} onChange={(e) => setContact({ ...contact, site: e.target.value })} />
              </div>
            )}

            {tab === 'text' && (
              <label className="block">
                <span className="text-sm font-medium text-foreground">Текст</span>
                <textarea
                  rows={5}
                  className={cn(inputClass, 'mt-1.5 resize-y')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
            )}

            {tab === 'event' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Название события"
                  className="sm:col-span-2"
                  value={event.title}
                  onChange={(e) => setEvent({ ...event, title: e.target.value })}
                />
                <Field
                  label="Время начала"
                  type="datetime-local"
                  value={event.start}
                  onChange={(e) => setEvent({ ...event, start: e.target.value })}
                />
                <Field
                  label="Время окончания"
                  type="datetime-local"
                  value={event.end}
                  onChange={(e) => setEvent({ ...event, end: e.target.value })}
                />
                <Field label="Место (необязательно)" value={event.place} onChange={(e) => setEvent({ ...event, place: e.target.value })} />
                <Field
                  label="Ссылка на событие (необязательно)"
                  value={event.url}
                  onChange={(e) => setEvent({ ...event, url: e.target.value })}
                />
              </div>
            )}

            {tab === 'geo' && (
              <Field
                label="Координаты"
                inputMode="decimal"
                placeholder="53.243400, 34.363300"
                value={coordinates}
                onChange={(e) => setCoordinates(e.target.value)}
                hint="В Яндекс Картах нажмите на нужную точку — координаты появятся в карточке места, их можно скопировать."
              />
            )}
          </div>
        </section>

        {/* Look */}
        <section className={panelClass}>
          <h2 className="text-base font-semibold text-foreground">Внешний вид</h2>

          <div className="mt-5">
            <span className="text-sm font-medium text-foreground">Тип</span>
            <div className="mt-2">
              <Radios name="frame" options={frames} value={frame} onChange={setFrame} />
            </div>
          </div>

          {frame !== 'card' && (
            <div className="mt-5">
              <span className="text-sm font-medium text-foreground">{frame === 'code' ? 'Цвет кода' : 'Стиль'}</span>
              <div className="mt-2 flex items-center gap-2.5">
                {brandColors.map((value) => (
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
                    !brandColors.includes(color) ? 'ring-2 ring-foreground' : 'ring-1 ring-border',
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
          )}

          {(frame === 'frame' || frame === 'background') && (
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Текст</span>
                <select className={cn(inputClass, 'mt-1.5')} value={labelChoice} onChange={(e) => setLabelChoice(e.target.value)}>
                  {labels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                  <option value={customLabel}>Свой текст</option>
                </select>
              </label>
              {labelChoice === customLabel && (
                <Field
                  label="Свой текст"
                  maxLength={labelLimit}
                  value={ownLabel}
                  onChange={(e) => setOwnLabel(e.target.value)}
                  hint={`Осталось символов: ${labelLimit - ownLabel.length}`}
                />
              )}
            </div>
          )}

          {frame === 'card' && (
            <div className="mt-5">
              <span className="text-sm font-medium text-foreground">Изображение</span>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex size-20 flex-none items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {photo ? (
                     
                    <img src={photo} alt="" className="size-full object-cover" />
                  ) : (
                    <CameraIcon className="size-7 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Размер изображения — не больше 5 МБ</p>
                  <label className="mt-2 inline-flex cursor-pointer rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/70">
                    Загрузить изображение
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => choosePhoto(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Extra */}
        <section className={panelClass}>
          <h2 className="text-base font-semibold text-foreground">Дополнительно</h2>

          <div className="mt-5">
            <span className="text-sm font-medium text-foreground">Иконка</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <LogoButton label="Без иконки" active={logoChoice === 'none'} onClick={() => setLogoChoice('none')}>
                <NoSymbolIcon className="size-6 text-muted-foreground" />
              </LogoButton>
              <LogoButton label="Atrial" active={logoChoice === 'atrial'} onClick={() => setLogoChoice('atrial')}>
                <svg viewBox="83 83 584 584" className="size-7" aria-hidden="true">
                  <path className="fill-foreground" d={qrMarkPath} />
                </svg>
              </LogoButton>
              <label
                className={cn(
                  'flex size-14 cursor-pointer items-center justify-center rounded-lg border border-dashed transition',
                  logoChoice === 'custom' ? 'border-foreground bg-muted' : 'border-border hover:bg-muted/60',
                )}
                title="Своя иконка: SVG, PNG или JPEG"
              >
                <span className="sr-only">Загрузить свою иконку</span>
                <ArrowUpTrayIcon className="size-6 text-muted-foreground" />
                <input
                  type="file"
                  accept=".svg,image/svg+xml,image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => chooseLogo(e.target.files?.[0])}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Свою иконку лучше загружать в SVG: тогда в файле для лазера она тоже будет контуром.
            </p>
          </div>

          {frame === 'card' && (
            <div className="mt-5 space-y-4">
              <Field
                label="Заголовок"
                placeholder="Введите заголовок"
                maxLength={titleLimit}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                hint={`Осталось символов: ${titleLimit - title.length}`}
              />
              <Field
                label="Подзаголовок"
                placeholder="Введите подзаголовок"
                maxLength={subtitleLimit}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                hint={`Осталось символов: ${subtitleLimit - subtitle.length}`}
              />
            </div>
          )}
        </section>
      </div>

      {/* Preview and files */}
      <aside className={cn(panelClass, 'lg:sticky lg:top-24')}>
        <div
          className={cn(
            'mx-auto w-full',
            frame === 'code'
              ? cn('max-w-72 rounded-xl p-4 shadow-sm ring-1 ring-black/5', darkBackdrop ? 'bg-[#111111]' : 'bg-white')
              : 'max-w-64',
          )}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        {payload && modules > 49 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            Код получился плотным: печатайте его крупнее или сократите содержимое.
          </p>
        )}

        <label className="mt-5 block">
          <span className="text-sm font-medium text-foreground">Ширина SVG</span>
          <span className="relative mt-1.5 block">
            <input
              type="number"
              inputMode="decimal"
              min={5}
              className={cn(inputClass, 'pr-10')}
              value={Number.isFinite(widthMm) ? widthMm : ''}
              onChange={(e) => setWidthMm(parseFloat(e.target.value))}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              мм
            </span>
          </span>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['png', 'svg'] as const).map((kind) => (
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
        {!payload && <p className="mt-2 text-center text-xs text-muted-foreground">Заполните поля, чтобы скачать код</p>}
        <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>SVG — векторный, код и надписи в нём уже кривыми: LightBurn и Illustrator открывают его без объединения.</li>
          <li>PNG — 2048 пикселей в ширину, для соцсетей и макетов.</li>
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
