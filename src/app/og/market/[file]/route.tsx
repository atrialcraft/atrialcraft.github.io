import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { generateCardOgImage, readOgPhoto } from '@/lib/og'
import { getAllProducts, productCover } from '@/lib/products'

export const dynamic = 'force-static'
export const dynamicParams = false

// One preview per product, rendered at build time to /og/market/<slug>.png
export async function generateStaticParams() {
  let products = await getAllProducts()
  return products.map((product) => ({ file: `${product.slug}.png` }))
}

/**
 * The imported photo only knows its built URL (/_next/static/media/01.<hash>.webp),
 * so the original is found in the product folder by its name
 */
async function findCover(slug: string, src: string) {
  let name = src.split('/').pop()!.split('.')[0]
  let folder = join(process.cwd(), 'src/app/market', slug)
  let file = (await readdir(folder)).find((f) => f.split('.')[0] === name)
  return file ? join(folder, file) : undefined
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  let slug = (await params).file.replace(/\.png$/, '')
  let product = (await getAllProducts()).find((p) => p.slug === slug)!
  let cover = productCover(product)
  let coverPath = cover ? await findCover(slug, cover.src) : undefined

  return generateCardOgImage({
    title: product.name,
    description: product.description,
    photo: coverPath ? await readOgPhoto(coverPath) : undefined,
    placeholder: true,
  })
}
