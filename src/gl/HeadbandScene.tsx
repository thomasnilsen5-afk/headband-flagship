'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { ACESFilmicToneMapping, Color, MathUtils, ShaderMaterial, Vector3, type Mesh } from 'three'
import { finishes, type BandForm, type Finish } from './finishes'
import { createBandGeometry } from './geometry'
import { fragmentShader, vertexShader } from './shaders'

/** Live inputs written by the page (no React re-renders per frame). */
export type SceneInputs = {
  pointer: { x: number; y: number } // -1..1
  tilt: { x: number; y: number } // -1..1 from device orientation
  progress: number // 0..1 scroll progress through the hero
  active: boolean // false when off-screen → render loop pauses
}

type Props = {
  inputs: MutableRefObject<SceneInputs>
  form: BandForm
  color?: string
  onReady?: () => void
  /** Product viewer mode: lets the user drag to rotate instead of following scroll. */
  mode?: 'hero' | 'viewer'
}

function Band({ inputs, form, color = '#c9ccd4', onReady, mode = 'hero' }: Props) {
  const mesh = useRef<Mesh>(null)
  const geometry = useMemo(() => createBandGeometry(form), [form])
  const finish = finishes[(form.finish ?? 'chrome') as Finish]
  const invalidate = useThree((s) => s.invalidate)
  const setDpr = useThree((s) => s.setDpr)
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))

  // Portrait screens: pull the camera back so the object is (almost) whole, and drop it
  // below the copy. A slight crop at the edges is intentional: monumental scale.
  const portrait = aspect < 1
  useEffect(() => {
    // The product viewer frames the whole object with breathing room; the hero crops for scale.
    camera.position.z = Math.max(mode === 'viewer' ? 5.6 : 4.6, 3.6 / aspect)
    camera.updateProjectionMatrix()
  }, [camera, aspect, mode])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uBreath: { value: 1 },
          uRipplePos: { value: new Vector3(9, 9, 9) },
          uRipple: { value: 0 },
          uBase: { value: new Color(color) },
          uChrome: { value: finish.chrome },
          uFilm: { value: finish.film },
          uRough: { value: finish.rough },
          uKnit: { value: finish.knit },
          uTint: { value: finish.tint },
          uAccentA: { value: new Color('#3ee6c1') },
          uAccentB: { value: new Color('#8a5cff') },
        },
      }),
    // Material is created once; finish/colour changes are animated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Ease finish and colour changes (variant switching in the product viewer).
  const target = useRef({ ...finish, color: new Color(color) })
  useEffect(() => {
    target.current = { ...finish, color: new Color(color) }
    invalidate()
  }, [finish, color, invalidate])

  const frames = useRef(0)
  const slow = useRef(0)
  const t = useRef(0)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const m = mesh.current
    if (!m) return
    t.current += dt
    const u = material.uniforms
    const s = inputs.current

    u.uTime!.value = t.current
    u.uRipple!.value *= Math.exp(-dt * 1.1)
    const k = 1 - Math.exp(-dt * 3)
    u.uChrome!.value = MathUtils.lerp(u.uChrome!.value, target.current.chrome, k)
    u.uFilm!.value = MathUtils.lerp(u.uFilm!.value, target.current.film, k)
    u.uRough!.value = MathUtils.lerp(u.uRough!.value, target.current.rough, k)
    u.uKnit!.value = MathUtils.lerp(u.uKnit!.value, target.current.knit, k)
    u.uTint!.value = MathUtils.lerp(u.uTint!.value, target.current.tint, k)
    ;(u.uBase!.value as Color).lerp(target.current.color, k)

    // Orientation: slow drift + attention toward the pointer + device tilt + scroll.
    const p = s.progress
    const rx =
      0.62 + s.pointer.y * 0.22 + s.tilt.y * 0.35 + p * 0.85 + Math.sin(t.current * 0.23) * 0.04
    const ry = t.current * 0.075 + s.pointer.x * 0.5 + s.tilt.x * 0.6 + p * 1.9
    const rz = -0.16 + Math.sin(t.current * 0.17) * 0.05 - p * 0.3
    const damp = 1 - Math.exp(-dt * (mode === 'viewer' ? 4 : 2.2))
    m.rotation.x = MathUtils.lerp(m.rotation.x, rx, damp)
    m.rotation.y = MathUtils.lerp(m.rotation.y, ry, damp)
    m.rotation.z = MathUtils.lerp(m.rotation.z, rz, damp)
    const scale = mode === 'hero' ? 1 - p * 0.18 : 1
    m.scale.setScalar(MathUtils.lerp(m.scale.x, scale, damp))
    const lift = mode === 'hero' && portrait ? -0.62 : 0
    m.position.y = MathUtils.lerp(m.position.y, lift + (mode === 'hero' ? p * 0.22 : 0), damp)

    // Adaptive quality: sustained slow frames drop the pixel ratio once.
    slow.current = rawDt > 1 / 40 ? slow.current + 1 : Math.max(0, slow.current - 1)
    if (slow.current > 90) {
      setDpr(1)
      slow.current = -1e9
    }

    frames.current++
    if (frames.current === 3) onReady?.()
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!mesh.current) return
    const local = mesh.current.worldToLocal(e.point.clone())
    material.uniforms.uRipplePos!.value.copy(local)
    material.uniforms.uRipple!.value = Math.min(1, material.uniforms.uRipple!.value + 0.08)
  }

  return <mesh ref={mesh} geometry={geometry} material={material} onPointerMove={onMove} />
}

function Loop({ inputs }: { inputs: MutableRefObject<SceneInputs> }) {
  // Pause rendering entirely when the canvas is off-screen or the tab is hidden.
  const setFrameloop = useThree((s) => s.setFrameloop)
  useFrame(() => {
    if (!inputs.current.active) setFrameloop('never')
  })
  useEffect(() => {
    const id = setInterval(() => {
      if (inputs.current.active && !document.hidden) setFrameloop('always')
    }, 250)
    return () => clearInterval(id)
  }, [inputs, setFrameloop])
  return null
}

export default function HeadbandScene(props: Props & { label: string }) {
  return (
    <Canvas
      role="img"
      aria-label={props.label}
      dpr={[1, 1.75]}
      camera={{ fov: 30, position: [0, 0.2, 4.6], near: 0.1, far: 50 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
      }}
      style={{ touchAction: 'pan-y' }}
    >
      <Band {...props} />
      <Loop inputs={props.inputs} />
    </Canvas>
  )
}
