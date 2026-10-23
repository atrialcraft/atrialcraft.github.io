import Link from 'next/link'
import Image, { type StaticImageData } from 'next/image'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'

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
import { typografChildren } from '@/lib/typography'
// Logos of the places, 96 × 96 px, in src/images/places
import atrialLogo from '@/images/places/atrial.webp'
import merchLogo from '@/images/places/merch.webp'
import mestoLogo from '@/images/places/mesto.webp'
import prostranstvoLogo from '@/images/places/prostranstvo.webp'
import retrushkaLogo from '@/images/places/retrushka.webp'

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
  /** The place's own site or channel: the logo and the name lead here */
  href: string
  /** Yandex Maps: the address leads here */
  map?: string
  logo: StaticImageData
}

const places: Array<Place> = [
  {
    name: 'Магазин на сайте',
    description: 'Все изделия и наборы, заказ через Telegram или ВКонтакте',
    href: '/market',
    logo: atrialLogo,
  },
  {
    name: '«Мэрч»',
    description: 'Наборы наличников с самовывозом и доставкой',
    href: 'https://smlerch.ru/',
    logo: merchLogo,
  },
  {
    name: '«Место»',
    description: 'Брянск, ул. Фокина, 29',
    href: 'https://t.me/mestostop',
    map: 'https://yandex.ru/maps/org/mesto/82750835163/',
    logo: mestoLogo,
  },
  {
    name: '«Пространство»',
    description: 'Брянск, ул. Дуки, 86',
    href: 'https://t.me/prostranstvo_brk',
    map: 'https://yandex.ru/maps/org/prostranstvo/235955667196/',
    logo: prostranstvoLogo,
  },
  {
    name: '«Ретрушка»',
    description: 'Брянск, ул. 3-го Интернационала, 4',
    href: 'https://www.retrushka.ru/',
    map: 'https://yandex.ru/maps/org/retrushka/188804613712/',
    logo: retrushkaLogo,
  },
]

function externalProps(href: string) {
  return href.startsWith('http')
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}
}

function WhereToBuy() {
  return (
    <div className="rounded-2xl border border-border p-6">
      <h2 className="flex text-sm font-semibold text-foreground">
        <BuildingStorefrontIcon className="size-6 flex-none text-muted-foreground" />
        <span className="ml-3">Где купить</span>
      </h2>
      <ul role="list" className="mt-6 space-y-4">
        {places.map(({ name, description, href, map, logo }) => (
          <li key={name} className="flex gap-4">
            <Link
              href={href}
              {...externalProps(href)}
              tabIndex={-1}
              aria-hidden
              className="mt-1 flex size-10 flex-none items-center justify-center rounded-full bg-card shadow-md ring-1 shadow-foreground/5 ring-border dark:border dark:border-border dark:bg-muted dark:ring-0"
            >
              <Image
                src={logo}
                alt=""
                className="size-7 rounded-full object-cover"
                sizes="1.75rem"
              />
            </Link>
            <div>
              <Link
                href={href}
                {...externalProps(href)}
                className="text-sm font-medium text-foreground transition hover:text-accent"
              >
                {name}
              </Link>
              {/* The address opens the place on Yandex Maps */}
              {map ? (
                <Link
                  href={map}
                  {...externalProps(map)}
                  className="block text-xs text-muted-foreground transition hover:text-accent"
                >
                  {typografChildren(description)}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {typografChildren(description)}
                </p>
              )}
            </div>
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
      <Container className="mt-13">
        <PageEnter className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
            {typografChildren(homeHeroTitle)}
          </h1>
          <p className="mt-6 text-base text-muted-foreground">
            {typografChildren(
              'Меня зовут Даниил, я из Брянска. Atrial — моя личная мастерская на окраине города: лазерная резка и гравировка, 3D-печать, RC-модели, Arduino. Сейчас больше всего занимаюсь брянскими наличниками — делаю наборы для сборки и провожу мастер-классы.',
            )}
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
              <h2 className="text-sm font-semibold tracking-tight">Блог</h2>
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
