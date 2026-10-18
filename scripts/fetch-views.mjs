// Fetches page views per URL path from the Yandex Metrika Reporting API and
// saves them to src/data/views.json, which the site reads at build time.
// Needs METRIKA_TOKEN (OAuth token with metrika:read) and YANDEX_METRIKA_ID.
// Without them it keeps the existing file, so the build still works.
import { writeFile } from 'node:fs/promises'

const token = process.env.METRIKA_TOKEN
const counterId = process.env.YANDEX_METRIKA_ID
const output = new URL('../src/data/views.json', import.meta.url)

if (!token || !counterId) {
  console.log(
    'fetch-views: METRIKA_TOKEN or YANDEX_METRIKA_ID is not set, skipping',
  )
  process.exit(0)
}

function normalize(path) {
  let clean = path.split(/[?#]/)[0]
  try {
    clean = decodeURI(clean)
  } catch {
    // Malformed %-escape from some bot: keep the path as is
  }
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean
}

let views = {}
let offset = 1
const limit = 10000

while (true) {
  let url = new URL('https://api-metrika.yandex.net/stat/v1/data')
  url.search = new URLSearchParams({
    ids: counterId,
    metrics: 'ym:pv:pageviews',
    dimensions: 'ym:pv:URLPath',
    date1: '2020-01-01',
    date2: 'today',
    limit: String(limit),
    offset: String(offset),
  })

  let response = await fetch(url, {
    headers: { Authorization: `OAuth ${token}` },
  }).catch((error) => {
    console.warn(`fetch-views: ${error.message}`)
    process.exit(0)
  })
  if (!response.ok) {
    // Don't fail the deploy because of statistics; just keep the old numbers
    console.warn(
      `fetch-views: Metrika API ${response.status}: ${await response.text()}`,
    )
    process.exit(0)
  }

  let { data, total_rows: totalRows } = await response.json()
  for (let row of data) {
    let path = normalize(row.dimensions[0].name ?? '')
    views[path] = (views[path] ?? 0) + Math.round(row.metrics[0])
  }

  offset += limit
  if (!data.length || !(offset <= totalRows)) {
    break
  }
}

await writeFile(output, JSON.stringify(views, null, 2) + '\n')
console.log(`fetch-views: saved views for ${Object.keys(views).length} pages`)
