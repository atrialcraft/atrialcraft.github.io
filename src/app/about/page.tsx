import Link from 'next/link'
import { cn } from '@/lib/utils'

import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import { Portrait } from '@/app/about/Portrait'
import { createPageMetadata } from '@/lib/metadata'
import { socialLinks } from '@/lib/site'

const heroTitle = 'Привет ✌ Меня зовут Даниил, я из Брянска.'

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
    'Daniil Kolbunov — мастерская Atrial в Брянске: лазерная резка, 3D-печать, Arduino.',
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
              Atrial — моя личная мастерская на окраине города. Здесь я делюсь
              текущими проектами и идеями: лазерная резка и гравировка, 3D-печать,
              RC-модели, Arduino и многое другое. Возможно, иногда будут
              залетать мемы с потешными котами, без этого никуда.
            </p>
            <p>
              Я родился в селе Лобановка Климовского района. Детство прошло среди
              деревенской тишины, резных узоров и запаха стружки из отцовской
              мастерской. Отец занимался резьбой по дереву, а учился он у
              Владимира Акулова — известного брянского мастера, который превратил
              обычный дом в произведение искусства. Так что любовь к народному
              ремеслу у меня, можно сказать, в крови.
            </p>
            <p>
              Сейчас я делаю серию брянских наличников: Злынка, Новозыбков,
              Клинцы и Климово. За основу беру не самые известные особняки, а
              детали обычных жилых домов, которые повторяются в местной застройке.
              Из них получаются небольшие зеркала со ставнями — их можно купить
              готовыми или собрать самому из набора, а ещё мы собираем и
              расписываем их на мастер-классах в{' '}
              <a href="https://t.me/mestostop" className="link-underline">
                «Месте»
              </a>
              .
            </p>
            <p>
              За последние годы накопилось немало работ: делал для себя, для
              друзей и для локальных брянских проектов — Candy, Цвети, Место,
              ЛизаАлерт и других. Для меня такие проекты — это в первую очередь
              вызов самому себе и возможность проверить навыки в незнакомой
              сфере.
            </p>
            <p>Спасибо, что заглянули. Буду рад познакомиться ближе.</p>
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
