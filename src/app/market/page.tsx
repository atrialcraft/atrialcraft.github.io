import Image from 'next/image'
import { PhotoIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import { SimpleLayout } from '@/components/SimpleLayout'
import { products, type Product } from '@/app/market/products'
import { createPageMetadata } from '@/lib/metadata'
import { site } from '@/lib/site'

function buyHref(product: Product) {
  let text = `Здравствуйте! Хочу купить: ${product.name}`
  return `${site.telegram}?text=${encodeURIComponent(text)}`
}

function ProductCard({ product }: { product: Product }) {
  return (
    <li className="flex gap-4">
      <div className="relative size-28 flex-none overflow-hidden rounded-xl bg-muted sm:size-32">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="8rem"
            className="object-cover"
          />
        ) : (
          <PhotoIcon
            aria-hidden
            className="absolute inset-0 m-auto size-8 text-muted-foreground"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {product.name}
        </h2>
        <p className="mt-1 line-clamp-3 text-sm text-pretty text-muted-foreground">
          {product.description}
        </p>
        <p className="mt-auto pt-3 text-sm font-semibold text-foreground">
          {product.price ?? 'Цена по запросу'}
        </p>
        <Button
          href={buyHref(product)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3"
        >
          Купить
        </Button>
      </div>
    </li>
  )
}

const heroTitle = 'Изделия из мастерской Atrial.'

export const metadata = createPageMetadata({
  title: 'Магазин',
  description: 'Изделия мастерской Atrial: наличники, сувениры и другое.',
  heroTitle,
})

export default function Shop() {
  return (
    <SimpleLayout
      title={heroTitle}
      intro="Всё сделано вручную в мастерской в Брянске. Нажмите «Купить» — откроется чат со мной в Telegram, там договоримся о цене, сроках и доставке."
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {products.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </ul>
    </SimpleLayout>
  )
}
