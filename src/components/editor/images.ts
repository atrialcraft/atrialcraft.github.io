// Prepares photos the way the writing guide recommends: at most 1600 px on
// the long side, WebP at ~82% quality, EXIF rotation applied. Browsers that
// can't encode WebP (older Safari) get a JPEG instead.

const maxSide = 1600
const quality = 0.82

let webpSupported: boolean | undefined

/** Whether this browser's canvas can encode WebP */
function canEncodeWebp() {
  if (webpSupported === undefined) {
    let canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpSupported
}

export async function compressPhoto(file: File) {
  let bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  let width = Math.round(bitmap.width * scale)
  let height = Math.round(bitmap.height * scale)
  let webp = canEncodeWebp()

  let canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  let context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available')
  }
  if (!webp) {
    // JPEG has no transparency: put PNG screenshots on white instead of black
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let type = webp ? 'image/webp' : 'image/jpeg'
  let blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error('Encoding failed')),
      type,
      quality,
    ),
  )
  return { blob, width, height, extension: webp ? 'webp' : 'jpg' }
}

/**
 * A picture for a fixed place on the site: cropped from the centre to
 * `width` × `height` (cover), or, without a height, scaled down so the
 * longer side is at most `width`. Always WebP where the browser can
 */
export async function fitPhoto(
  file: Blob,
  width: number,
  height?: number,
  quality = 0.85,
) {
  let bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  let w: number
  let h: number
  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height
  if (height) {
    w = width
    h = height
    let scale = Math.max(width / bitmap.width, height / bitmap.height)
    sw = width / scale
    sh = height / scale
    sx = (bitmap.width - sw) / 2
    sy = (bitmap.height - sh) / 2
  } else {
    let scale = Math.min(1, width / Math.max(bitmap.width, bitmap.height))
    w = Math.round(bitmap.width * scale)
    h = Math.round(bitmap.height * scale)
  }
  let canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  let context = canvas.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h)
  bitmap.close()
  let blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error('Encoding failed')),
      canEncodeWebp() ? 'image/webp' : 'image/jpeg',
      quality,
    ),
  )
  return { blob, width: w, height: h }
}

/** Next free name: 01.webp, 02.webp… */
export function nextPhotoName(existing: Array<string>, extension = 'webp') {
  let numbers = existing
    .map((name) => parseInt(name, 10))
    .filter(Number.isFinite)
  let next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${String(next).padStart(2, '0')}.${extension}`
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}
