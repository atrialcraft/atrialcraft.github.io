import Image from 'next/image'
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
import { InlineText } from '@/components/RichText'
import { projectsContent } from '@/lib/content'
export const metadata = createPageMetadata({
  title: 'Проекты',
  description: projectsContent.description,
  page: 'projects',
})

export default function Projects() {
  return (
    <SimpleLayout
      title={projectsContent.title}
      intro={<InlineText text={projectsContent.intro} />}
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
      >
        {projectsContent.items.map((project) => (
          <li key={project.name}>
            <ContentCard className="h-full">
              <div
                className={cn(
                  'relative z-10 flex size-12 items-center justify-center rounded-full text-sm font-semibold text-foreground',
                  iconChromeClassName,
                )}
              >
                {project.logo ? (
                  // Logos, 128 × 128 px, in public/images/projects
                  <Image
                    src={`/images/projects/${project.logo}`}
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
                href={project.href}
                external={project.href.startsWith('http')}
                className="mt-6"
              >
                {project.name}
              </ContentCardTitle>
              <ContentCardDescription className="text-pretty">
                {project.description}
              </ContentCardDescription>
              <p className="relative z-10 mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-muted-foreground transition group-hover:text-accent">
                <LinkIcon className="size-4 flex-none" />
                <span className="line-clamp-1">{project.label}</span>
              </p>
            </ContentCard>
          </li>
        ))}
      </ul>
    </SimpleLayout>
  )
}
