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
              своими проектами и идеями: лазерная резка, 3D-печать, Arduino и
              многое другое.
            </p>
            <p>
              Делал для себя, для друзей и даже для локальных брянских проектов.
              Долгое время всё это просто оставалось в галерее телефона, а
              теперь буду показывать и рассказывать об этом здесь, в Telegram и
              Instagram.
            </p>
            <p>
              Возможно, иногда будут залетать мемы с потешными котами, без этого
              никуда.
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
