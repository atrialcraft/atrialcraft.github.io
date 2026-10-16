import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { PageEnter } from '@/components/PageEnter'
import { Prose } from '@/components/Prose'
import { buyHref, formatPrice, type ProductMeta } from '@/lib/products'

export function ProductLayout({
  product,
  children,
}: {
  product: ProductMeta
  children: React.ReactNode
}) {
  return (
    <Container className="mt-16 lg:mt-32">
      <div className="xl:relative">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/market"
            aria-label="Назад в магазин"
            className="group mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-md ring-1 shadow-foreground/5 ring-border transition lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0 dark:bg-muted dark:ring-0 dark:hover:ring-1 dark:hover:ring-foreground/20"
          >
            <ArrowLeftIcon className="size-4 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
          <article>
            <PageEnter as="header" className="flex flex-col">
              <h1 className="text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-6 text-base text-muted-foreground">
                {product.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {formatPrice(product.price)}
                </p>
                <Button
                  href={buyHref(product)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Купить
                </Button>
                {product.instruction && (
                  <Button href={product.instruction} variant="secondary">
                    <BookOpenIcon className="size-4" />
                    Инструкция
                  </Button>
                )}
              </div>
            </PageEnter>

            <PageEnter index={1}>
              {product.image && (
                <div className="mt-8 overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={product.image}
                    alt={product.name}
                    className="h-auto w-full object-cover"
                    sizes="(min-width: 768px) 42rem, 100vw"
                    priority
                  />
                </div>
              )}

              <Prose className="mt-8">{children}</Prose>
            </PageEnter>
          </article>
        </div>
      </div>
    </Container>
  )
}
