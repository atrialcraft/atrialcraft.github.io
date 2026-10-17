import Link from 'next/link'
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'

import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import {
  ContentCard,
  ContentCardCta,
  ContentCardDescription,
  ContentCardEyebrow,
  ContentCardTitle,
} from '@/components/ContentCard'
import { Button } from '@/components/Button'
import { PhotoGallery } from '@/components/PhotoGallery'
import { formatDate } from '@/lib/formatDate'
import { getHomePosts, type Post } from '@/lib/posts'
import { postCtaLabel } from '@/lib/blog'
import { homeHeroTitle, socialLinks } from '@/lib/site'

function LatestPost({ post }: { post: Post }) {
  return (
    <ContentCard as="article">
      <ContentCardTitle href={post.href}>{post.title}</ContentCardTitle>
      <ContentCardEyebrow as="time" dateTime={post.date}>
        {formatDate(post.date)}
      </ContentCardEyebrow>
      <ContentCardDescription className="text-pretty">
        {post.description}
      </ContentCardDescription>
      <ContentCardCta>{postCtaLabel[post.type]}</ContentCardCta>
    </ContentCard>
  )
}

function SocialLink({
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link className="group -m-1 p-1" {...props}>
      <Icon className="size-6 fill-muted-foreground transition group-hover:fill-foreground" />
    </Link>
  )
}

interface Place {
  name: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const places: Array<Place> = [
  {
    name: 'Магазин на сайте',
    description: 'Все изделия и наборы, заказ через Telegram или ВКонтакте',
    href: '/market',
    icon: ShoppingBagIcon,
  },
  {
    name: '«Место»',
    description: 'Брянск, ул. Фокина, 29: готовые изделия и наборы',
    href: 'https://t.me/mestostop',
    icon: MapPinIcon,
  },
  {
    name: '«Мэрч»',
    description: 'Наборы наличников с самовывозом и доставкой',
    href: 'https://smlerch.ru/',
    icon: GlobeAltIcon,
  },
]

function WhereToBuy() {
  return (
    <div className="rounded-2xl border border-border p-6">
      <h2 className="flex text-sm font-semibold text-foreground">
        <BuildingStorefrontIcon className="size-6 flex-none text-muted-foreground" />
        <span className="ml-3">Где купить</span>
      </h2>
      <ul role="list" className="mt-6 space-y-4">
        {places.map(({ name, description, href, icon: Icon }) => (
          <li key={name}>
            <Link href={href} className="group flex gap-4">
              <div className="mt-1 flex size-10 flex-none items-center justify-center rounded-full bg-card shadow-md ring-1 shadow-foreground/5 ring-border dark:border dark:border-border dark:bg-muted dark:ring-0">
                <Icon className="size-5 text-muted-foreground transition group-hover:text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground transition group-hover:text-accent">
                  {name}
                </p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Button href="/market" variant="secondary" className="mt-6 w-full">
        Перейти в магазин
      </Button>
    </div>
  )
}

export default async function Home() {
  let posts = await getHomePosts()

  return (
    <>
      <Container className="mt-16 sm:mt-32">
        <PageEnter className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
            {homeHeroTitle}
          </h1>
          <p className="mt-6 text-base text-muted-foreground">
            Меня зовут Даниил, я из Брянска. Atrial — моя личная мастерская на
            окраине города: лазерная резка и гравировка, 3D-печать, RC-модели,
            Arduino. Сейчас больше всего занимаюсь брянскими наличниками — делаю
            наборы для сборки и провожу мастер-классы.
          </p>
          <div className="mt-6 flex gap-6">
            {socialLinks.map((link) => (
              <SocialLink
                key={link.href}
                href={link.href}
                aria-label={link.label}
                icon={link.icon}
              />
            ))}
          </div>
        </PageEnter>
      </Container>
      <PhotoGallery />
      <Container className="mt-24 md:mt-28">
        <PageEnter index={3}>
          <div className="mx-auto grid max-w-xl grid-cols-1 gap-y-20 lg:max-w-none lg:grid-cols-2">
            <div className="space-y-10">
              <h2 className="text-sm font-semibold tracking-tight">Свежее</h2>
              <div className="flex flex-col gap-16">
                {posts.map((post) => (
                  <LatestPost key={post.href} post={post} />
                ))}
              </div>
            </div>

            <div className="space-y-10 lg:pl-16 xl:pl-24">
              <WhereToBuy />
            </div>
          </div>
        </PageEnter>
      </Container>
    </>
  )
}
