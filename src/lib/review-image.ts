import sharp from 'sharp'

/**
 * Review photos are re-encoded server-side: bounded to 1600 px, WebP, and with all metadata
 * dropped (sharp strips EXIF/XMP/ICC unless asked to keep them), so a phone photo never
 * publishes its GPS position or camera serial.
 */
export async function normaliseReviewPhoto(input: Buffer) {
  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate() // apply EXIF orientation before the metadata is dropped
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
}
