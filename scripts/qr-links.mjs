// Short addresses for QR codes on shelves and cards: atrial.org/q/mesto leads
// to the target page with UTM tags, so Metrika shows visits per place
// (Источники → Метки UTM). Writes public/q/<slug>.html redirect pages before
// the build; GitHub Pages serves them at /q/<slug> without the extension.
// A printed code stays valid: to send it elsewhere, change the target here.
import { mkdir, rm, writeFile } from 'node:fs/promises'

const links = [
  { slug: 'mesto', target: '/blog/nabory-bryanskih-nalichnikov' },
  { slug: 'prostranstvo', target: '/blog/nabory-bryanskih-nalichnikov' },
  { slug: 'retrushka', target: '/blog/nabory-bryanskih-nalichnikov' },
  { slug: 'merch', target: '/blog/nabory-bryanskih-nalichnikov' },
  // Thank-you card in the nalichnik sets
  { slug: 'card', target: '/instructions' },
]

const output = new URL('../public/q/', import.meta.url)

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })

for (let { slug, target } of links) {
  let url = `${target}?utm_source=qr&utm_medium=offline&utm_campaign=${slug}`
  let html = `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${url}">
<title>Atrial</title>
<script>location.replace(${JSON.stringify(url)})</script>
<a href="${url}">atrial.org</a>
</html>
`
  await writeFile(new URL(`${slug}.html`, output), html)
}

console.log(`qr-links: ${links.length} pages in public/q`)
