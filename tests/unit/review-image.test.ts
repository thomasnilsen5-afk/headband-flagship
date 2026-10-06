import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normaliseReviewPhoto } from '@/lib/review-image'

async function phonePhoto() {
  // A 3000×2000 JPEG carrying the kind of EXIF a phone writes, including a GPS position.
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#3ee6c1' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'PhoneCo', Model: 'P1', Copyright: 'secret-owner' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '59/1 54/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '10/1 45/1 0/1',
      },
    })
    .toBuffer()
}

describe('review photos', () => {
  it('drops EXIF (including GPS) and re-encodes to bounded WebP', async () => {
    const input = await phonePhoto()
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const { data, info } = await normaliseReviewPhoto(input)
    const meta = await sharp(data).metadata()
    expect(info.format).toBe('webp')
    expect(meta.exif).toBeUndefined()
    expect(meta.xmp).toBeUndefined()
    expect(Math.max(info.width, info.height)).toBe(1600)
    expect(data.includes(Buffer.from('secret-owner'))).toBe(false)
  })

  it('never enlarges small photos', async () => {
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer()
    const { info } = await normaliseReviewPhoto(small)
    expect([info.width, info.height]).toEqual([400, 300])
  })

  it('rejects data that is not an image', async () => {
    await expect(normaliseReviewPhoto(Buffer.from('not an image'))).rejects.toThrow()
  })
})
