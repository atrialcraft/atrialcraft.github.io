import Image from 'next/image'
import Link from 'next/link'
import { PhotoIcon } from '@heroicons/react/24/outline'

import { BuyButton } from '@/components/BuyButton'
import { SimpleLayout } from '@/components/SimpleLayout'
import { createPageMetadata } from '@/lib/metadata'
import { formatPrice, getAllProducts, type Product } from '@/lib/products'

function ProductCard({ product }: { product: Product }) {
  return (
    <li className="group flex gap-4">
      <Link
        href={product.href}
        tabIndex={-1}
        aria-hidden
        className="relative size-28 flex-none overflow-hidden rounded-xl bg-muted sm:size-32"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="8rem"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <PhotoIcon className="absolute inset-0 m-auto size-8 text-muted-foreground" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          <Link href={product.href} className="transition hover:text-accent">
            {product.name}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-3 text-sm text-pretty text-muted-foreground">
          {product.description}
        </p>
        <p className="mt-auto pt-3 text-sm font-semibold text-foreground">
          {formatPrice(product.price)}
        </p>
        <BuyButton
          productName={product.name}
          available={product.available}
          className="mt-3"
        />
      </div>
    </li>
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
