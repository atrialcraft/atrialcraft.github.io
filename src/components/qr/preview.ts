import sharp from 'sharp'

import { nestedCode } from '@/components/qr/layout'
import { qrMarkLogo } from '@/components/qr/mark'
import { createQrSvg } from '@/components/qr/qr'

/**
 * Photo for the preview of /qr: a code made by the generator itself, leading
 * to the generator, on the same grey as a product without a photo. 3:4, like
 * the other page photos
 */
export async function qrPreviewPhoto() {
  let code = createQrSvg('https://atrial.org/qr', { color: '#111111', logo: qrMarkLogo('#111111') })
  let width = 300
  let height = 400
  let size = 220
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="900" height="1200">
<rect width="${width}" height="${height}" fill="#e0e0e0"/>
${nestedCode(code)((width - size) / 2, (height - size) / 2, size)}
</svg>`
  let png = await sharp(Buffer.from(svg)).png().toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}
