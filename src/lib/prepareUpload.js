// ============================================
// CLIENT-SIDE UPLOAD PREP
// ============================================
// Vercel rejects any request body over 4.5MB with 413 FUNCTION_PAYLOAD_TOO_LARGE
// before our API route even runs. Modern phone photos of receipts are routinely
// 4-8MB, so they silently failed to upload. Shrink images in the browser first.

// Stay safely under Vercel's 4.5MB limit (multipart overhead + other fields).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

// Long edge in px. Plenty for reading a receipt; Claude vision downsizes
// anything past ~1568px anyway.
const MAX_DIMENSION = 2400

// Images already this small are sent as-is.
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies EXIF rotation so sideways phone photos stay upright.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to <img> decoding.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * Resize/re-encode an image File to a JPEG under the upload limit.
 * Non-images (PDF, Excel, CSV) and images the browser can't decode (e.g. HEIC
 * outside Safari) are returned unchanged.
 */
export async function compressImageForUpload(file) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file

  let source
  try {
    source = await decodeImage(file)
  } catch {
    return file
  }

  const width = source.width
  const height = source.height
  if (!width || !height) return file

  let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  let quality = 0.85
  let blob = null

  // Shrink progressively until it fits (normally the first pass does).
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    blob = await canvasToBlob(canvas, quality)
    if (blob && blob.size <= MAX_UPLOAD_BYTES) break
    scale *= 0.8
    quality = Math.max(0.6, quality - 0.1)
  }

  if (typeof source.close === 'function') source.close()
  if (!blob || blob.size >= file.size) return file

  const baseName = (file.name || 'receipt').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

/**
 * Compress if possible, then throw a readable error if the file still can't be
 * uploaded — instead of letting Vercel return a non-JSON 413.
 */
export async function prepareFileForUpload(file) {
  const prepared = await compressImageForUpload(file)
  if (prepared.size > MAX_UPLOAD_BYTES) {
    const mb = (prepared.size / 1024 / 1024).toFixed(1)
    throw new Error(
      prepared.type === 'application/pdf'
        ? `This PDF is ${mb}MB — the limit is 4MB. Try scanning at a lower quality or splitting it into pages.`
        : `This file is ${mb}MB — the limit is 4MB. Try a smaller photo, or share it as a JPEG.`
    )
  }
  return prepared
}

/**
 * Read an upload API response safely. Platform errors (413, 504 timeouts) come
 * back as plain text/HTML, so response.json() throws and callers used to show a
 * generic "Failed to upload". Always return { ok, status, data, error }.
 */
export async function readUploadResponse(response) {
  const text = await response.text().catch(() => '')
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (response.ok) return { ok: true, status: response.status, data, error: null }

  let error = data?.error
  if (!error) {
    if (response.status === 413) error = 'File is too large to upload (4MB max). Try a smaller photo.'
    else if (response.status === 504) error = 'The upload timed out. Check the Documents page — it may still have saved — then retry.'
    else error = `Upload failed (HTTP ${response.status})`
  }
  return { ok: false, status: response.status, data, error }
}
