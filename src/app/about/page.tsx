import Link from 'next/link'
import { cn } from '@/lib/utils'

import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import { Portrait } from '@/app/about/Portrait'
import { createPageMetadata } from '@/lib/metadata'
import { socialLinks } from '@/lib/site'
import { typografChildren } from '@/lib/typography'
import { RichText } from '@/components/RichText'
import { aboutContent } from '@/lib/content'
import { PhoneIcon } from '@/components/SocialIcons'

// Временно: телефон для подтверждения сайта в Яндексе, потом убрать
const phone = {
  href: 'tel:+79997054545',
  label: '+7 999 705-45-45',
  icon: PhoneIcon,
}

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
  description: aboutContent.description,
  page: 'about',
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
            {typografChildren(aboutContent.title)}
          </h1>
          <div className="mt-6 space-y-7 text-base text-muted-foreground">
            <RichText text={aboutContent.text} />
          </div>
        </PageEnter>
        <PageEnter className="lg:pl-20">
          <ul role="list">
            {[...socialLinks, phone].map((link, index) => (
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
