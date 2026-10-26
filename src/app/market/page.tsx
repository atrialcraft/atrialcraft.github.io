import Image from 'next/image'
import { PhotoIcon } from '@heroicons/react/24/outline'

import { BuyButton } from '@/components/BuyButton'
import {
  ContentCard,
  ContentCardDescription,
  ContentCardTitle,
} from '@/components/ContentCard'
import { SimpleLayout } from '@/components/SimpleLayout'
import { createPageMetadata } from '@/lib/metadata'
import { sectionsContent } from '@/lib/content'
import {
  formatPrice,
  getAllProducts,
  productCover,
  type Product,
} from '@/lib/products'

// Photo on top, then the name and a description of up to ~160 characters.
// The whole card is one link with a hover highlight; the buy button sits
// above that link layer and works on its own.
function ProductCard({ product }: { product: Product }) {
  let cover = productCover(product)
  return (
    <ContentCard as="li" className="h-full" data-product-card>
      <div
        data-product-cover
        className="relative z-10 aspect-3/4 w-full overflow-hidden rounded-xl bg-muted"
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <PhotoIcon className="absolute inset-0 m-auto size-10 text-muted-foreground" />
        )}
      </div>
      <ContentCardTitle href={product.href} className="mt-5">
        {product.name}
      </ContentCardTitle>
      <ContentCardDescription className="line-clamp-4 text-pretty">
        {product.description}
      </ContentCardDescription>
      {/* z-30: above the card-wide link (z-20), otherwise «Купить» opens the product page */}
      <div className="relative z-30 mt-auto flex w-full flex-wrap items-center justify-between gap-3 pt-4">
        <p className="text-sm font-semibold text-foreground">
          {formatPrice(product.price)}
        </p>
        <BuyButton productName={product.name} available={product.available} />
      </div>
    </ContentCard>
  )
}

export const metadata = createPageMetadata({
  title: 'Магазин',
  description: sectionsContent.market.description,
  page: 'market',
})

export default async function Market() {
  let products = await getAllProducts()

  return (
    <SimpleLayout
      title={sectionsContent.market.title}
      intro={sectionsContent.market.intro}
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
      >
        {products.map((product) => (
          <ProductCard key={product.href} product={product} />
        ))}
      </ul>
    </SimpleLayout>
  )
}
