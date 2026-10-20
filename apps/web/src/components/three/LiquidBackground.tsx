'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Liquid Shader Material ───────────────────────────────────────────────────

const liquidVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  uniform float uTime;
  uniform float uMorphSpeed;
  uniform float uMorphIntensity;
  
  // Simplex 3D noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Liquid morph displacement
    float noise = snoise(position * 0.5 + uTime * uMorphSpeed);
    float noise2 = snoise(position * 1.2 - uTime * uMorphSpeed * 0.7);
    float displacement = (noise + noise2 * 0.5) * uMorphIntensity;
    
    vec3 newPosition = position + normal * displacement;
    vPosition = newPosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

const liquidFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  uniform vec2 uResolution;
  
  // Noise for texture
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    // Fresnel effect
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
    
    // Color mixing based on position and time
    float t = uTime * 0.3;
    float pattern = fbm(vUv * 3.0 + vec2(t, -t * 0.7));
    pattern += fbm(vUv * 6.0 - vec2(t * 1.5, t * 0.5)) * 0.5;
    pattern += fbm(vUv * 12.0 + vec2(t * 0.8, -t * 1.2)) * 0.25;
    
    // Three-color gradient
    vec3 color = mix(uColorA, uColorB, smoothstep(0.3, 0.7, pattern));
    color = mix(color, uColorC, smoothstep(0.7, 1.0, pattern));
    
    // Add fresnel glow
    color += fresnel * 0.5 * uColorB;
    
    // Subtle scanlines
    float scanlines = sin(vUv.y * uResolution.y * 0.1 + uTime * 5.0) * 0.02;
    color += scanlines;
    
    // Vignette
    float vignette = 1.0 - length(vUv - 0.5) * 1.2;
    color *= vignette;
    
    float alpha = uOpacity * (0.3 + fresnel * 0.7) * vignette;
    
    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Liquid Blob Mesh ─────────────────────────────────────────────────────────

interface LiquidBlobProps {
  colorA: string
  colorB: string
  colorC: string
  scale?: number
  speed?: number
  intensity?: number
  opacity?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
}

const LiquidBlob = ({
  colorA,
  colorB,
  colorC,
  scale = 1,
  speed = 1,
  intensity = 0.3,
  opacity = 0.15,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: LiquidBlobProps) => {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const { viewport } = useThree()

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005 * speed
      meshRef.current.rotation.x += 0.0002 * speed
    }
  })

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: liquidVertexShader,
      fragmentShader: liquidFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uMorphSpeed: { value: 0.3 * speed },
        uMorphIntensity: { value: intensity },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) },
        uColorC: { value: new THREE.Color(colorC) },
        uOpacity: { value: opacity },
        uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
      },
    })
    materialRef.current = mat
    return mat
  }, [colorA, colorB, colorC, speed, intensity, opacity, viewport.width, viewport.height])

  const geometry = useMemo(() => new THREE.SphereGeometry(1 * scale, 64, 64), [scale])

  // Use a regular group with Framer Motion wrapper for entrance animation
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={mounted ? 1 : 0}
    >
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </group>
  )
}

// ─── Floating Particles ───────────────────────────────────────────────────────

interface ParticleFieldProps {
  count?: number
  color?: string
  size?: number
  speed?: number
  spread?: number
}

const ParticleField = ({
  count = 150,
  color = '#7c3aed',
  size = 0.02,
  speed = 0.5,
  spread = 50,
}: ParticleFieldProps) => {
  const pointsRef = useRef<THREE.Points | null>(null)
  const { viewport } = useThree()

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array
      const velocities = pointsRef.current.geometry.attributes.userData.array
      const time = state.clock.getElapsedTime()

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        positions[i3 + 1] += velocities[i] * 0.01 * speed
        
        // Reset particles that go too high
        if (positions[i3 + 1] > spread / 2) {
          positions[i3 + 1] = -spread / 2
          positions[i3] = (Math.random() - 0.5) * spread
          positions[i3 + 2] = (Math.random() - 0.5) * spread
        }
        
        // Add subtle horizontal drift
        positions[i3] += Math.sin(time + i) * 0.001
        positions[i3 + 2] += Math.cos(time + i) * 0.001
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.rotation.y += 0.0001 * speed
    }
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * spread
      positions[i3 + 1] = (Math.random() - 0.5) * spread
      positions[i3 + 2] = (Math.random() - 0.5) * spread
      velocities[i] = 0.5 + Math.random() * 1.5
      sizes[i] = size * (0.5 + Math.random() * 1.5)
      alphas[i] = 0.2 + Math.random() * 0.6
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('userData', new THREE.BufferAttribute(velocities, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    return geo
  }, [count, size, spread])

  const material = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(color),
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    vertexColors: false,
  }), [color])

  // Custom shader for particle size and alpha
  const particleMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uSize: { value: size * 100 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - 0.5);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
        // Pulse effect
        alpha *= 0.8 + 0.2 * sin(uTime * 3.0 + gl_PointCoord.x * 10.0);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  }), [color, size])

  return <points ref={pointsRef} geometry={geometry} material={particleMaterial} />
}

// ─── Grid Floor ───────────────────────────────────────────────────────────────

const GridFloor = ({ color = '#06b6d4', opacity = 0.03, gridSize = 100, divisions = 50 }) => {
  const { viewport } = useThree()
  
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uGridSize: { value: gridSize },
      uDivisions: { value: divisions },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = position.xz / 100.0 + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uGridSize;
      uniform float uDivisions;
      varying vec2 vUv;
      void main() {
        vec2 grid = abs(fract(vUv * uDivisions) - 0.5);
        float line = step(max(grid.x, grid.y), 0.02);
        float pulse = 0.5 + 0.5 * sin(uTime * 0.5 + vUv.x * 10.0);
        float alpha = line * uOpacity * pulse;
        // Moving highlight line
        float scan = smoothstep(0.0, 0.02, abs(vUv.y - fract(uTime * 0.1)));
        alpha += scan * uOpacity * 2.0;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  }), [color, opacity, gridSize, divisions])

  const geometry = useMemo(() => new THREE.PlaneGeometry(gridSize, gridSize, 1, 1), [gridSize])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} geometry={geometry} material={material} />
  )
}

// ─── Main Liquid Background Component ─────────────────────────────────────────

interface LiquidBackgroundProps {
  className?: string
  variant?: 'violet' | 'cyan' | 'liquid' | 'plasma' | 'tournament'
  interactive?: boolean
  children?: React.ReactNode
}

export function LiquidBackground({
  className = '',
  variant = 'tournament',
  interactive = true,
  children,
}: LiquidBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!interactive) return
    const handleMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setMouse({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        })
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [interactive])

  const config = useMemo(() => {
    switch (variant) {
      case 'violet':
        return {
          blobs: [
            { colorA: '#7c3aed', colorB: '#8b5cf6', colorC: '#a855f7', scale: 1.5, position: [-10, 5, -10] as [number, number, number], speed: 1, intensity: 0.25 },
            { colorA: '#5b21b6', colorB: '#7c3aed', colorC: '#8b5cf6', scale: 1.2, position: [10, -2, -15] as [number, number, number], speed: 0.7, intensity: 0.2 },
          ],
          particles: { color: '#7c3aed', count: 100, spread: 60 },
          grid: { color: '#7c3aed', opacity: 0.02 },
        }
      case 'cyan':
        return {
          blobs: [
            { colorA: '#06b6d4', colorB: '#22d3ee', colorC: '#67e8f9', scale: 1.5, position: [-8, 3, -12] as [number, number, number], speed: 1, intensity: 0.25 },
            { colorA: '#0e7490', colorB: '#06b6d4', colorC: '#22d3ee', scale: 1.1, position: [12, 0, -10] as [number, number, number], speed: 0.8, intensity: 0.2 },
          ],
          particles: { color: '#06b6d4', count: 100, spread: 60 },
          grid: { color: '#06b6d4', opacity: 0.02 },
        }
      case 'liquid':
        return {
          blobs: [
            { colorA: '#7c3aed', colorB: '#06b6d4', colorC: '#22c55e', scale: 1.8, position: [0, 2, -12] as [number, number, number], speed: 1, intensity: 0.35 },
            { colorA: '#06b6d4', colorB: '#22c55e', colorC: '#7c3aed', scale: 1.3, position: [-5, -3, -15] as [number, number, number], speed: 0.7, intensity: 0.3 },
            { colorA: '#22c55e', colorB: '#7c3aed', colorC: '#06b6d4', scale: 1.1, position: [8, 5, -18] as [number, number, number], speed: 1.2, intensity: 0.25 },
          ],
          particles: { color: '#06b6d4', count: 150, spread: 80 },
          grid: { color: '#06b6d4', opacity: 0.03 },
        }
      case 'plasma':
        return {
          blobs: [
            { colorA: '#f97316', colorB: '#ec4899', colorC: '#8b5cf6', scale: 1.6, position: [0, 0, -12] as [number, number, number], speed: 1.2, intensity: 0.4 },
            { colorA: '#ec4899', colorB: '#8b5cf6', colorC: '#f97316', scale: 1.2, position: [-6, -2, -14] as [number, number, number], speed: 0.9, intensity: 0.35 },
            { colorA: '#8b5cf6', colorB: '#f97316', colorC: '#ec4899', scale: 1.4, position: [7, 4, -16] as [number, number, number], speed: 1.1, intensity: 0.3 },
          ],
          particles: { color: '#ec4899', count: 180, spread: 90 },
          grid: { color: '#ec4899', opacity: 0.025 },
        }
      case 'tournament':
      default:
        return {
          blobs: [
            { colorA: '#7c3aed', colorB: '#8b5cf6', colorC: '#a855f7', scale: 1.4, position: [-8, 4, -12] as [number, number, number], speed: 0.8, intensity: 0.2 },
            { colorA: '#06b6d4', colorB: '#22d3ee', colorC: '#67e8f9', scale: 1.2, position: [10, -1, -14] as [number, number, number], speed: 0.6, intensity: 0.18 },
            { colorA: '#22c55e', colorB: '#4ade80', colorC: '#86efac', scale: 1.0, position: [0, 6, -16] as [number, number, number], speed: 1, intensity: 0.15 },
          ],
          particles: { color: '#7c3aed', count: 80, spread: 50 },
          grid: { color: '#06b6d4', opacity: 0.02 },
        }
    }
  }, [variant])

  return (
    <div
      ref={containerRef}
      className={cn('fixed inset-0 z-0 pointer-events-none overflow-hidden', className)}
      style={{ backgroundColor: '#050508' }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 25], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <color attach="background" args={['#050508']} />
        <fog attach="fog" args={['#050508', 10, 50]} />
        
        {/* Grid floor */}
        <GridFloor color={config.grid.color} opacity={config.grid.opacity} />
        
        {/* Liquid blobs */}
        {config.blobs.map((blob, i) => (
          <LiquidBlob key={i} {...blob} />
        ))}
        
        {/* Particle field */}
        <ParticleField {...config.particles} />
        
        {/* Ambient light for subtle illumination */}
        <ambientLight intensity={0.1} />
      </Canvas>
      
      {/* CSS-based fallback for reduced motion */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, ${config.blobs[0]?.colorA || '#7c3aed'}15 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, ${config.blobs[1]?.colorA || '#06b6d4'}15 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, ${config.blobs[2]?.colorA || '#22c55e'}10 0%, transparent 60%)
          `,
        }}
        aria-hidden="true"
      />
      
      {children}
    </div>
  )
}

export default LiquidBackground