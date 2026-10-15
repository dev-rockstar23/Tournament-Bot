import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

function RotatingEmblem() {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.1
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.3
      wireRef.current.rotation.x += delta * 0.1
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.52, 1]} />
        <meshBasicMaterial color="#9f5bff" wireframe />
      </mesh>
    </group>
  )
}

function FloatingRings() {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const ring3 = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ring1.current) ring1.current.rotation.x = t * 0.5
    if (ring2.current) ring2.current.rotation.y = t * 0.3
    if (ring3.current) {
      ring3.current.rotation.x = t * 0.4
      ring3.current.rotation.z = t * 0.2
    }
  })

  return (
    <>
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 8, 64]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[3, 0.02, 8, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>
      <mesh ref={ring3} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
        <torusGeometry args={[3.5, 0.015, 8, 64]} />
        <meshBasicMaterial color="#9f5bff" transparent opacity={0.2} />
      </mesh>
    </>
  )
}

function Particles() {
  const count = 500
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return arr
  }, [])

  const particlesRef = useRef<THREE.Points>(null)
  useFrame((_, delta) => {
    if (particlesRef.current) particlesRef.current.rotation.y += delta * 0.02
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#94a3b8" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

export default function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 60 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#7c3aed" />
      <pointLight position={[-5, -5, 5]} intensity={1.5} color="#06b6d4" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#9f5bff" />
      <RotatingEmblem />
      <FloatingRings />
      <Particles />
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} intensity={0.8} radius={0.4} />
      </EffectComposer>
    </Canvas>
  )
}
