import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import type { BandForm } from './finishes'

/**
 * Procedural headband: a rounded-rectangle profile (superellipse) swept along a closed,
 * slightly elliptical loop that undulates and twists. Normals are analytic, so the seam is
 * invisible and the chrome reflections stay liquid.
 */
export function createBandGeometry(form: BandForm, { segments = 320, profile = 36 } = {}) {
  const widthMm = form.width_mm ?? 42
  const halfW = Math.min(0.42, Math.max(0.14, widthMm * 0.0052))
  const halfT = Math.min(0.06, Math.max(0.022, (form.thickness ?? 0.07) * 0.42))
  const waves = form.waves ?? 3
  const waveAmp = 0.03
  const twist = (form.twist ?? 0) * Math.PI * 0.5
  const rx = 1
  const rz = 0.84
  const n = 6 // superellipse exponent: higher = squarer profile

  const rows = segments + 1
  const cols = profile + 1
  const positions = new Float32Array(rows * cols * 3)
  const normals = new Float32Array(rows * cols * 3)
  const uvs = new Float32Array(rows * cols * 2)
  const indices: number[] = []

  const up = new Vector3(0, 1, 0)
  const c = new Vector3()
  const t = new Vector3()
  const n0 = new Vector3()
  const b0 = new Vector3()
  const N = new Vector3()
  const B = new Vector3()
  const p = new Vector3()
  const nn = new Vector3()

  const spow = (v: number, e: number) => Math.sign(v) * Math.abs(v) ** e

  for (let i = 0; i < rows; i++) {
    const u = (i / segments) * Math.PI * 2
    c.set(rx * Math.cos(u), waveAmp * Math.sin(waves * u), rz * Math.sin(u))
    t.set(-rx * Math.sin(u), waveAmp * waves * Math.cos(waves * u), rz * Math.cos(u)).normalize()
    n0.crossVectors(up, t).normalize() // outward
    b0.crossVectors(t, n0).normalize() // ~up
    const theta = twist * Math.sin(u * 2)
    const ct = Math.cos(theta)
    const st = Math.sin(theta)
    N.copy(n0).multiplyScalar(ct).addScaledVector(b0, st)
    B.copy(b0).multiplyScalar(ct).addScaledVector(n0, -st)

    for (let j = 0; j < cols; j++) {
      const phi = (j / profile) * Math.PI * 2
      const cx = Math.cos(phi)
      const sy = Math.sin(phi)
      const x = halfT * spow(cx, 2 / n)
      const y = halfW * spow(sy, 2 / n)
      p.copy(c).addScaledVector(N, x).addScaledVector(B, y)
      const gx = spow(cx, 2 - 2 / n) / halfT
      const gy = spow(sy, 2 - 2 / n) / halfW
      nn.set(0, 0, 0).addScaledVector(N, gx).addScaledVector(B, gy).normalize()

      const k = i * cols + j
      positions.set([p.x, p.y, p.z], k * 3)
      normals.set([nn.x, nn.y, nn.z], k * 3)
      uvs.set([i / segments, j / profile], k * 2)
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < profile; j++) {
      const a = i * cols + j
      const b = (i + 1) * cols + j
      indices.push(a, a + 1, b, b, a + 1, b + 1) // CCW seen from outside
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}
