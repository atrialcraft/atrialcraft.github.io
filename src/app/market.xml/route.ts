import { getSiteUrl } from '@/lib/metadata'
import { getAllProducts } from '@/lib/products'
import { operator, site } from '@/lib/site'

export const dynamic = 'force-static'

// Products for Yandex (Business, Products, Direct) in the YML format:
// https://yandex.ru/support/merchants/ru/offers — rebuilt with the site.
// Only products with a price go in: YML has no «price on request»

const categories = [
  { id: 1, name: 'Наличники', test: (name: string) => name.startsWith('Наличник') },
  { id: 2, name: 'Часы', test: (name: string) => name.startsWith('Часы') },
  { id: 3, name: 'Изделия мастерской', test: () => true },
]

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`)

/** 2026-11-01T12:00+03:00, the date format of YML */
function catalogDate(date: Date) {
  let moscow = new Date(date.getTime() + 3 * 60 * 60 * 1000)
  return `${moscow.toISOString().slice(0, 16)}+03:00`
}

export async function GET() {
  let siteUrl = getSiteUrl()
  let products = (await getAllProducts()).filter((product) => product.price !== undefined)

  let offers = products.map((product) => {
    let category = categories.find((c) => c.test(product.name))!
    let pictures = (product.images ?? (product.image ? [product.image] : []))
      .slice(0, 10)
      .map((image) => `        <picture>${escape(`${siteUrl}${image.src}`)}</picture>`)
    return [
      `      <offer id="${escape(product.slug)}" available="${product.available === false ? 'false' : 'true'}">`,
      `        <name>${escape(product.name)}</name>`,
      `        <url>${escape(`${siteUrl}${product.href}`)}</url>`,
      `        <price>${product.price}</price>`,
      `        <currencyId>RUR</currencyId>`,
      `        <categoryId>${category.id}</categoryId>`,
      ...pictures,
      `        <description>${escape(product.description)}</description>`,
      `      </offer>`,
    ].join('\n')
  })

  let used = categories.filter((c) => products.some((p) => c === categories.find((x) => x.test(p.name))))

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${catalogDate(new Date())}">
  <shop>
    <name>${escape(site.brand)}</name>
    <company>${escape(operator.name)}</company>
    <url>${escape(siteUrl)}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${used.map((c) => `      <category id="${c.id}">${escape(c.name)}</category>`).join('\n')}
    </categories>
    <offers>
${offers.join('\n')}
    </offers>
  </shop>
</yml_catalog>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
