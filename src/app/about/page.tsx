import Link from 'next/link'
import { cn } from '@/lib/utils'

import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import { Portrait } from '@/app/about/Portrait'
import { createPageMetadata } from '@/lib/metadata'
import { socialLinks } from '@/lib/site'

const heroTitle = 'Я Даниил, делаю вещи в своей мастерской в Брянске.'

function SocialLink({
  className,
  href,
  children,
  icon: Icon,
}: {
  className?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <li className={cn(className, 'flex')}>
      <Link
        href={href}
        className="group flex text-sm font-medium text-foreground transition hover:text-accent"
      >
        <Icon className="size-6 flex-none fill-muted-foreground transition group-hover:fill-accent" />
        <span className="ml-4">{children}</span>
      </Link>
    </li>
  )
}

export const metadata = createPageMetadata({
  title: 'Обо мне',
  description:
    'Даниил Колбунов и мастерская Atrial в Брянске: лазерная резка, 3D-печать, электроника и брянские наличники.',
  heroTitle,
})

export default function About() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-12">
        <div className="lg:pl-20">
          <Portrait />
        </div>
        <PageEnter className="lg:order-first lg:row-span-2">
          <h1 className="text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
            {heroTitle}
          </h1>
          <div className="mt-6 space-y-7 text-base text-muted-foreground">
            <p>
              Atrial — моя мастерская на окраине Брянска. Здесь я режу и
              гравирую на лазерном станке, печатаю на 3D-принтере, собираю
              электронику на Arduino, а когда выпадает случай — варю металл. Мне
              нравится самому проходить весь путь от идеи и чертежа до готовой
              вещи.
            </p>
            <p>
              Любовь к ремеслу у меня из детства. Я вырос в селе Лобановка
              Климовского района, и дома всегда пахло стружкой: отец занимался
              резьбой по дереву, а учился он у брянского мастера Владимира
              Акулова.
            </p>
            <p>
              Поэтому мой главный проект сейчас — серия брянских наличников. Я
              беру детали обычных домов Злынки, Новозыбкова, Клинцов, Климово и
              Верхнего Судка и превращаю их в небольшие зеркала со ставнями. Их
              можно купить готовыми или собрать самому из набора, а ещё мы
              собираем и расписываем их на мастер-классах в{' '}
              <a href="https://t.me/mestostop" className="link-underline">
                «Месте»
              </a>
              .
            </p>
            <p>
              Кроме этого делаю вещи на заказ и для брянских проектов: от
              органайзеров и уличных штендеров до часов на советских
              газоразрядных индикаторах. Если хотите что-то обсудить, пишите в
              Telegram или ВКонтакте.
            </p>
          </div>
        </PageEnter>
        <PageEnter className="lg:pl-20">
          <ul role="list">
            {socialLinks.map((link, index) => (
              <SocialLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                className={index > 0 ? 'mt-4' : undefined}
              >
                {link.label}
              </SocialLink>
            ))}
          </ul>
        </PageEnter>
      </div>
    </Container>
  )
}
