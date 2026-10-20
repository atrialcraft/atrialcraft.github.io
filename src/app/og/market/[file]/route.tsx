import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

import { generateProductOgImage } from '@/lib/og'
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
async function readCover(slug: string, src: string) {
  let name = src.split('/').pop()!.split('.')[0]
  let folder = join(process.cwd(), 'src/app/market', slug)
  let file = (await readdir(folder)).find((f) => f.split('.')[0] === name)
  if (!file) return undefined

  // The preview renderer doesn't read WebP, so the photo goes in as JPEG
  return {
    data: await sharp(await readFile(join(folder, file)))
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
    type: 'image/jpeg',
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  let slug = (await params).file.replace(/\.png$/, '')
  let product = (await getAllProducts()).find((p) => p.slug === slug)!
  let cover = productCover(product)

  return generateProductOgImage({
    name: product.name,
    description: product.description,
    photo: cover ? await readCover(slug, cover.src) : undefined,
  })
}
