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
import { formatPrice, getAllProducts, type Product } from '@/lib/products'

// Same card as on /projects: the whole card is one link with a hover
// highlight; the buy button sits above that link layer and works on its own.
function ProductCard({ product }: { product: Product }) {
  return (
    <ContentCard as="li" className="h-full flex-row gap-4">
      <div className="relative z-10 size-28 flex-none overflow-hidden rounded-xl bg-muted sm:size-32">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="8rem"
            className="object-cover"
          />
        ) : (
          <PhotoIcon className="absolute inset-0 m-auto size-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start self-stretch">
        <ContentCardTitle href={product.href}>{product.name}</ContentCardTitle>
        <ContentCardDescription className="mt-1 line-clamp-3 text-pretty">
          {product.description}
        </ContentCardDescription>
        <p className="relative z-10 mt-auto pt-3 text-sm font-semibold text-foreground">
          {formatPrice(product.price)}
        </p>
        <BuyButton
          productName={product.name}
          available={product.available}
          className="relative z-30 mt-3"
        />
      </div>
    </ContentCard>
  )
}

const heroTitle = 'Изделия из мастерской Atrial.'

export const metadata = createPageMetadata({
  title: 'Магазин',
  description: 'Изделия мастерской Atrial: наличники, часы и другое.',
  heroTitle,
})

export default async function Market() {
  let products = await getAllProducts()

  return (
    <SimpleLayout
      title={heroTitle}
      intro="Всё сделано вручную в мастерской в Брянске. Нажмите «Купить» и выберите, где удобнее написать: в Telegram или ВКонтакте. Там договоримся о сроках и доставке."
    >
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {products.map((product) => (
          <ProductCard key={product.href} product={product} />
        ))}
      </ul>
    </SimpleLayout>
  )
}
