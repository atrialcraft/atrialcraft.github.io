import type { Metadata } from 'next'
import { type StaticImageData } from 'next/image'
import glob from 'fast-glob'

import { createOpenGraphImages } from '@/lib/metadata'

export interface ProductMeta {
  name: string
  /** Короткое описание для карточки в магазине и превью в соцсетях */
  description: string
  /** Цена в рублях. Без цены будет «Цена по запросу» */
  price?: number
  /** Одно фото товара, лежит в папке товара */
  image?: StaticImageData
  /**
   * Несколько фото: на странице товара — карусель, в карточке магазина —
   * первое из них. Если заданы, `image` не нужен
   */
  images?: Array<StaticImageData>
  /** Ссылка на инструкцию, например '/instructions/zlynka' */
  instruction?: string
  /** Порядок в магазине: меньше — выше. Без него товар встаёт в конец */
  order?: number
  /** false — товар пока нельзя купить: карточка открывается, «Купить» неактивна */
  available?: boolean
}

export type Product = ProductMeta & {
  slug: string
  href: string
}

export function formatPrice(price?: number) {
  return price === undefined
    ? 'Цена по запросу'
    : `${price.toLocaleString('ru-RU')} ₽`
}

/** Main photo: the first one of `images`, or `image` */
export function productCover(product: ProductMeta) {
  return product.images?.[0] ?? product.image
}

export function createProductMetadata(product: ProductMeta): Metadata {
  let cover = productCover(product)
  let images = cover
    ? [{ url: cover.src, alt: product.name }]
    : createOpenGraphImages(product.name)

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: images.map((image) => image.url),
    },
  }
}

export async function getAllProducts() {
  let filenames = await glob('*/page.mdx', { cwd: './src/app/market' })

  let products = await Promise.all(
    filenames.map(async (filename): Promise<Product> => {
      let { product } = (await import(`../app/market/${filename}`)) as {
        product: ProductMeta
      }
      let slug = filename.replace(/\/page\.mdx$/, '')

      return { slug, href: `/market/${slug}`, ...product }
    }),
  )

  return products.sort(
    (a, z) =>
      (a.order ?? Infinity) - (z.order ?? Infinity) ||
      a.name.localeCompare(z.name, 'ru'),
  )
}
