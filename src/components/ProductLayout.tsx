import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import { BuyButton } from '@/components/BuyButton'
import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import { ImageCarousel } from '@/components/ImageCarousel'
import { Prose } from '@/components/Prose'
import { formatPrice, productCover, type ProductMeta } from '@/lib/products'

/**
 * Product page in the same column as articles and instructions. From tablet
 * width up: photos on the left (3:4, sticky while the text scrolls), name,
 * price, buttons and the description on the right — a 3:4 photo at the full
 * column width would not fit a laptop screen. On a phone everything stacks.
 */
export function ProductLayout({
  product,
  children,
}: {
  product: ProductMeta
  children: React.ReactNode
}) {
  let cover = productCover(product)

  return (
    <Container className="mt-16 lg:mt-32">
      <div className="xl:relative">
        {/* Same column width and back button as on articles and instructions */}
        <div className="mx-auto max-w-2xl">
          <Link
            href="/market"
            aria-label="Назад в магазин"
            className="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-md ring-1 shadow-foreground/5 ring-border transition lg:absolute lg:left-12 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:bg-muted dark:ring-0 dark:hover:ring-1 dark:hover:ring-foreground/20"
          >
            <ArrowLeftIcon className="size-4 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
          <article className="grid gap-10 sm:grid-cols-2 sm:items-start sm:gap-8">
            <PageEnter className="sm:sticky sm:top-[calc(var(--banner-h)+5.5rem)]">
              {product.images && product.images.length > 1 ? (
                <ImageCarousel
                  className="my-0"
                  imageClassName="aspect-3/4"
                  images={product.images.map((src, i) => ({
                    src,
                    alt: `${product.name}, фото ${i + 1}`,
                  }))}
                />
              ) : (
                cover && (
                  <div className="overflow-hidden rounded-3xl bg-muted">
                    <Image
                      src={cover}
                      alt={product.name}
                      className="aspect-3/4 h-auto w-full object-cover"
                      sizes="(min-width: 640px) 21rem, 100vw"
                      priority
                    />
                  </div>
                )
              )}
            </PageEnter>

            <div>
              <PageEnter as="header" index={1} className="flex flex-col">
                <h1 className="text-3xl font-semibold tracking-tight text-pretty text-foreground">
                  {product.name}
                </h1>
                <p className="mt-4 text-base text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {formatPrice(product.price)}
                  </p>
                  <BuyButton
                    productName={product.name}
                    available={product.available}
                  />
                  {product.instruction && (
                    <Button href={product.instruction} variant="secondary">
                      <BookOpenIcon className="size-4" />
                      Инструкция
                    </Button>
                  )}
                </div>
              </PageEnter>

              <PageEnter index={2}>
                <Prose className="mt-10">{children}</Prose>
              </PageEnter>
            </div>
          </article>
        </div>
      </div>
    </Container>
  )
}
