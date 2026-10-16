import { generateOgImage } from '@/lib/og'
import { homeHeroTitle } from '@/lib/site'

export const dynamic = 'force-static'

// Site-wide Open Graph image, rendered once at build time to /og.png
export async function GET() {
  return generateOgImage({ title: homeHeroTitle })
}
