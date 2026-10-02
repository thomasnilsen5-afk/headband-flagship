import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DropTeaser } from '@/components/home/DropTeaser'
import { HeroStage } from '@/components/home/HeroStage'
import { Manifesto } from '@/components/home/Manifesto'
import { Objects } from '@/components/home/Objects'
import { Specimen } from '@/components/home/Specimen'
import { Reveal } from '@/components/motion/Reveal'

// Catalog and drop data are re-fetched at most every 5 minutes (ISR).
export const revalidate = 300

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const a = await getTranslations('a11y')

  return (
    <>
      <HeroStage
        copy={{
          eyebrow: t('eyebrow'),
          titleLines: t.raw('titleLines') as string[],
          lede: t('lede'),
          cta: t('cta'),
          scroll: t('scroll'),
          canvasLabel: a('objectCanvas'),
          motionOn: a('motionOn'),
          booting: locale === 'nb' ? 'Initialiserer objekt' : 'Initialising object',
          live: locale === 'nb' ? 'Objekt 01 · sanntid' : 'Object 01 · real time',
        }}
      />
      <Specimen />
      <Objects />
      <DropTeaser />
      <Manifesto />
      <Reveal />
    </>
  )
}
