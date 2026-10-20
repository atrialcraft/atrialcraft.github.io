import Image, { type ImageProps } from 'next/image'
import { LinkIcon } from '@heroicons/react/24/outline'

import {
  ContentCard,
  ContentCardDescription,
  ContentCardTitle,
} from '@/components/ContentCard'
import { SimpleLayout } from '@/components/SimpleLayout'
import { iconChromeClassName } from '@/lib/iconChrome'
import { createPageMetadata } from '@/lib/metadata'
import { cn } from '@/lib/utils'
import electromaImage from '@/app/market/electroma/photo.jpg'
import nalichnikImage from '@/app/market/zlynka/photo.jpeg'
interface Project {
  name: string
  description: string
  link: { href: string; label: string }
  logo?: ImageProps['src']
}

const projects: Array<Project> = [
  {
    name: 'Брянские наличники',
    description:
      'Серия зеркал-наличников по мотивам деревянной архитектуры Злынки, Новозыбкова, Клинцов, Климово и Верхнего Судка: наборы для сборки, инструкции и мастер-классы.',
    link: { href: '/projects/nalichniki', label: 'О проекте' },
    logo: nalichnikImage,
  },
  {
    name: 'Часы «Электрома»',
    description:
      'Часы на советских газоразрядных индикаторах ИН-12Б: каждая цифра светится внутри стеклянной колбы.',
    link: { href: '/projects/electroma', label: 'О проекте' },
    logo: electromaImage,
  },
  {
    name: 'Candy',
    description:
      'Брянский цветочный магазин. Сварил для них уличный штендер и сделал органайзер в стиле IKEA Skådis.',
    link: {
      href: 'https://t.me/candy_flowers32',
      label: 't.me/candy_flowers32',
    },
  },
  {
    name: 'Цвети',
    description:
      'Органайзер в стиле IKEA Skådis с навесными аксессуарами, напечатанными на 3D-принтере.',
    link: {
      href: 'https://t.me/cvetiplease',
      label: 't.me/cvetiplease',
    },
  },
  {
    name: 'Место',
    description:
      'Пространство в Брянске, где проходят мои мастер-классы по сборке и росписи наличников и продаются наборы.',
    link: {
      href: 'https://t.me/mestostop',
      label: 't.me/mestostop',
    },
  },
  {
    name: 'ЛизаАлерт',
    description:
      'Брянский поисково-спасательный отряд. Один из локальных проектов, для которых я делал работы в мастерской.',
    link: {
      href: 'https://t.me/LizaAlert_brnsk',
      label: 't.me/LizaAlert_brnsk',
    },
  },
]

const heroTitle = 'Собственные проекты и работы для брянских мест.'

export const metadata = createPageMetadata({
  title: 'Проекты',
  description:
    'Проекты мастерской Atrial: для себя, для друзей и для брянских проектов.',
  heroTitle,
})

export default function Projects() {
  return (
    <SimpleLayout
      title={heroTitle}
      intro={
        <>
          Делал для себя, для друзей и даже для локальных брянских проектов.
          Больше работ — в{' '}
          <a href="https://t.me/atrialcraft" className="link-underline">
            Telegram-канале
          </a>{' '}
          и{' '}
          <a
            href="https://instagram.com/atrialcraft"
            className="link-underline"
          >
            Instagram*
          </a>
          .
        </>
      }
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((project) => (
          <li key={project.name}>
            <ContentCard className="h-full">
              <div
                className={cn(
                  'relative z-10 flex size-12 items-center justify-center rounded-full text-sm font-semibold text-foreground',
                  iconChromeClassName,
                )}
              >
                {project.logo ? (
                  <Image
                    src={project.logo}
                    alt=""
                    width={48}
                    height={48}
                    className="size-full rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  project.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <ContentCardTitle
                href={project.link.href}
                external={project.link.href.startsWith('http')}
                className="mt-6"
              >
                {project.name}
              </ContentCardTitle>
              <ContentCardDescription className="text-pretty">
                {project.description}
              </ContentCardDescription>
              <p className="relative z-10 mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-muted-foreground transition group-hover:text-accent">
                <LinkIcon className="size-4 flex-none" />
                <span className="line-clamp-1">{project.link.label}</span>
              </p>
            </ContentCard>
          </li>
        ))}
      </ul>
    </SimpleLayout>
  )
}
