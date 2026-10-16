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
interface Project {
  name: string
  description: string
  link: { href: string; label: string }
  logo?: ImageProps['src']
}

const projects: Array<Project> = [
  {
    name: 'Candy',
    description:
      'Локальный брянский проект, для которого я делал работы в мастерской.',
    link: {
      href: 'https://instagram.com/candy_flowers_brnsk/',
      label: 'instagram.com/candy_flowers_brnsk',
    },
  },
  {
    name: 'Цвети',
    description:
      'Локальный брянский проект, для которого я делал работы в мастерской.',
    link: {
      href: 'https://instagram.com/cveti_please/',
      label: 'instagram.com/cveti_please',
    },
  },
  {
    name: 'Место',
    description:
      'Локальный брянский проект, для которого я делал работы в мастерской.',
    link: {
      href: 'https://instagram.com/mesto_stop/',
      label: 'instagram.com/mesto_stop',
    },
  },
  {
    name: 'ЛизаАлерт',
    description:
      'Брянский поисково-спасательный отряд. Один из локальных проектов, для которых я делал работы в мастерской.',
    link: {
      href: 'https://vk.ru/la_bryansk',
      label: 'vk.ru/la_bryansk',
    },
  },
]

const heroTitle = 'Проекты, для которых я что-то делал в мастерской.'

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
            Instagram
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
                  'relative z-20 flex size-12 items-center justify-center rounded-full text-sm font-semibold text-foreground',
                  iconChromeClassName,
                )}
              >
                {project.logo ? (
                  <Image
                    src={project.logo}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-full"
                    unoptimized
                  />
                ) : (
                  project.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <ContentCardTitle
                href={project.link.href}
                external
                className="mt-6"
              >
                {project.name}
              </ContentCardTitle>
              <ContentCardDescription className="text-pretty">
                {project.description}
              </ContentCardDescription>
              <p className="relative z-20 mt-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition group-hover:text-accent">
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
