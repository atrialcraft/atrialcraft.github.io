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
