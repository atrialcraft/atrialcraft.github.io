import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
 * The imported photo only knows its built URL (/_next/static/media/01.<hash>.jpeg),
 * so the original is found in the product folder by its name
 */
async function readCover(slug: string, src: string) {
  let name = src.split('/').pop()!.split('.')[0]
  let folder = join(process.cwd(), 'src/app/market', slug)
  let file = (await readdir(folder)).find((f) => f.split('.')[0] === name)
  if (!file) return undefined

  let extension = file.split('.').pop()!.toLowerCase()
  return {
    data: await readFile(join(folder, file)),
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
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
