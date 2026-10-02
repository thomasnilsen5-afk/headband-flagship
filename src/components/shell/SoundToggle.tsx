'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

/**
 * Optional ambient layer, OFF by default. Synthesised live with WebAudio (no audio files):
 * three detuned sine partials plus slowly filtered noise, like a room that hums.
 */
function createAmbient(ctx: AudioContext) {
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  filter.Q.value = 0.7
  filter.connect(master)

  const partials = [55, 82.41, 110.3, 164.8].map((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.detune.value = (i % 2 ? 1 : -1) * (3 + i * 2)
    const gain = ctx.createGain()
    gain.gain.value = 0.18 / (i + 1)
    osc.connect(gain).connect(filter)
    osc.start()
    return osc
  })

  // Pinkish noise, very low.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0
  for (let i = 0; i < data.length; i++) {
    b0 = 0.997 * b0 + (Math.random() * 2 - 1) * 0.05
    data[i] = b0
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.25
  noise.connect(noiseGain).connect(filter)
  noise.start()

  // Slow tide on the filter cutoff.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.045
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 180
  lfo.connect(lfoGain).connect(filter.frequency)
  lfo.start()

  return {
    fadeTo(value: number, seconds: number) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(value, ctx.currentTime, seconds / 3)
    },
    stop() {
      for (const o of [...partials, lfo]) o.stop()
      noise.stop()
    },
  }
}

export function SoundToggle() {
  const t = useTranslations('a11y')
  const [on, setOn] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const ambientRef = useRef<ReturnType<typeof createAmbient> | null>(null)

  useEffect(() => {
    if (!on) {
      ambientRef.current?.fadeTo(0, 0.8)
      const ctx = ctxRef.current
      const id = window.setTimeout(() => void ctx?.suspend(), 1200)
      return () => window.clearTimeout(id)
    }
    ctxRef.current ??= new AudioContext()
    const ctx = ctxRef.current
    void ctx.resume()
    ambientRef.current ??= createAmbient(ctx)
    ambientRef.current.fadeTo(0.07, 2.5)
  }, [on])

  // Pause with the tab.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) void ctxRef.current?.suspend()
      else if (on) void ctxRef.current?.resume()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [on])

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t('soundOff') : t('soundOn')}
      onClick={() => setOn((v) => !v)}
      className="group flex h-6 items-center gap-[3px] px-1 text-bone"
    >
      {[0.5, 1, 0.7, 0.35].map((h, i) => (
        <span
          key={i}
          aria-hidden
          className="block w-px origin-center bg-current transition-transform duration-700 ease-fluid"
          style={{
            height: '14px',
            transform: `scaleY(${on ? h : 0.15})`,
            animation: on
              ? `sound-bar 1.6s ${i * 0.17}s var(--ease-tide) infinite alternate`
              : undefined,
          }}
        />
      ))}
      <style>{`@keyframes sound-bar{to{transform:scaleY(.2)}}`}</style>
    </button>
  )
}
