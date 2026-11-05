import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// ── Animated hexagonal prism (logo emblem) ────────────────────────────────
function HexEmblem() {
  const outerRef  = useRef<THREE.Mesh>(null)
  const innerRef  = useRef<THREE.Mesh>(null)
  const wireRef   = useRef<THREE.Mesh>(null)
  const groupRef  = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.28
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.12
    }
    if (innerRef.current) {
      innerRef.current.rotation.x += delta * 0.18
      innerRef.current.rotation.z += delta * 0.12
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.22
      wireRef.current.rotation.x += delta * 0.08
    }
  })

  return (
    <group ref={groupRef}>
      {/* Core icosahedron — solid, glowing */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial
          color="#7c3aed"
          roughness={0.15}
          metalness={0.9}
          emissive="#5b21b6"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Inner spinning detail */}
      <mesh ref={innerRef} scale={0.7}>
        <octahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial
          color="#9f5bff"
          roughness={0.0}
          metalness={1.0}
          emissive="#7c3aed"
          emissiveIntensity={0.8}
          wireframe
        />
      </mesh>

      {/* Outer wireframe shell */}
      <mesh ref={wireRef} scale={1.6}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

// ── Three orbital rings ───────────────────────────────────────────────────
function OrbitalRings() {
  const r1 = useRef<THREE.Mesh>(null)
  const r2 = useRef<THREE.Mesh>(null)
  const r3 = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    if (r1.current) { r1.current.rotation.x = t * 0.55; r1.current.rotation.z = t * 0.1 }
    if (r2.current) { r2.current.rotation.y = t * 0.35; r2.current.rotation.z = t * 0.15 }
    if (r3.current) { r3.current.rotation.x = t * 0.20; r3.current.rotation.y = -t * 0.25 }
  })

  return (
    <>
      <mesh ref={r1}>
        <torusGeometry args={[2.6, 0.025, 8, 96]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.50} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[3.2, 0.018, 8, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
      </mesh>
      <mesh ref={r3}>
        <torusGeometry args={[3.8, 0.012, 8, 128]} />
        <meshBasicMaterial color="#9f5bff" transparent opacity={0.20} />
      </mesh>
    </>
  )
}

// ── Energy arcs — thin animated sine-wave tubes ───────────────────────────
function EnergyArc({ color, radius, speed, phase }: {
  color: string; radius: number; speed: number; phase: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 2 + phase) * 0.3, Math.sin(angle) * radius))
    }
    return pts
  }, [radius, phase])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.y = t * speed
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.4
  })

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
    return new THREE.Line(geo, mat)
  }, [points, color])

  return (
    <group ref={groupRef}>
      <primitive object={lineObj} />
    </group>
  )
}

// ── Particle field ────────────────────────────────────────────────────────
function Particles() {
  const COUNT = 1200
  const ref   = useRef<THREE.Points>(null)
  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const vel = new Float32Array(COUNT * 3)
    const c1 = new THREE.Color('#7c3aed')
    const c2 = new THREE.Color('#22d3ee')
    const c3 = new THREE.Color('#9f5bff')
    for (let i = 0; i < COUNT; i++) {
      const r = 4 + Math.random() * 10
      const θ = Math.random() * Math.PI * 2
      const φ = Math.acos(2 * Math.random() - 1)
      pos[i * 3]     = r * Math.sin(φ) * Math.cos(θ)
      pos[i * 3 + 1] = r * Math.sin(φ) * Math.sin(θ)
      pos[i * 3 + 2] = r * Math.cos(φ)
      vel[i * 3]     = (Math.random() - 0.5) * 0.003
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.003
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003
      const mix = Math.random()
      const c   = mix < 0.33 ? c1 : mix < 0.66 ? c2 : c3
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    return { positions: pos, colors: col, velocities: vel }
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.015
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     += velocities[i * 3]
      arr[i * 3 + 1] += velocities[i * 3 + 1]
      arr[i * 3 + 2] += velocities[i * 3 + 2]
      const dist = Math.sqrt(arr[i*3]**2 + arr[i*3+1]**2 + arr[i*3+2]**2)
      if (dist > 14 || dist < 3) {
        velocities[i * 3]     *= -1
        velocities[i * 3 + 1] *= -1
        velocities[i * 3 + 2] *= -1
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  )
}

// ── Glowing pulse sphere ──────────────────────────────────────────────────
function PulseSphere() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ref.current) {
      const s = 1 + Math.sin(t * 1.8) * 0.06
      ref.current.scale.setScalar(s)
    }
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshBasicMaterial color="#7c3aed" transparent opacity={0.06} />
    </mesh>
  )
}

// ── Scene root ────────────────────────────────────────────────────────────
export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 55 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.15} />
      <pointLight position={[6, 6, 6]}   intensity={3.5} color="#7c3aed" />
      <pointLight position={[-6, -4, 4]} intensity={2.5} color="#06b6d4" />
      <pointLight position={[0, 8, -4]}  intensity={1.2} color="#9f5bff" />

      <HexEmblem />
      <OrbitalRings />
      <PulseSphere />
      <EnergyArc color="#7c3aed" radius={4.5} speed={0.30} phase={0} />
      <EnergyArc color="#22d3ee" radius={5.2} speed={-0.22} phase={1.2} />
      <EnergyArc color="#9f5bff" radius={3.9} speed={0.18} phase={2.4} />
      <Particles />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          intensity={1.8}
          radius={0.6}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0008, 0.0008)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </Canvas>
  )
}
