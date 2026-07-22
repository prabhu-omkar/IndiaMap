import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geoMercator } from 'd3-geo'
import { StateData } from '../data/indiaData'
import { STATE_TERRAIN, TERRAIN_INFO } from '../data/terrainData'
import { HeatmapMode } from '../App'

const projection = geoMercator().center([82, 23]).scale(20).translate([0, 0])

// All geometry is built at this constant depth.
// Height is controlled by group.scale.y so it can be lerped each frame.
const BASE_DEPTH = 0.5

function coordsToShape(coords: number[][]): THREE.Shape | null {
  const shape = new THREE.Shape()
  let started = false
  for (const [lng, lat] of coords) {
    const p = projection([lng, lat])
    if (!p) continue
    if (!started) { shape.moveTo(p[0], -p[1]); started = true }
    else shape.lineTo(p[0], -p[1])
  }
  if (!started) return null
  shape.closePath()
  return shape
}

function geometryToShapes(geometry: any): THREE.Shape[] {
  const shapes: THREE.Shape[] = []
  const processPolygon = (rings: number[][][]) => {
    const outer = coordsToShape(rings[0])
    if (!outer) return
    for (let i = 1; i < rings.length; i++) {
      const hole = coordsToShape(rings[i])
      if (hole) outer.holes.push(new THREE.Path(hole.getPoints()))
    }
    shapes.push(outer)
  }
  if (geometry.type === 'Polygon')           processPolygon(geometry.coordinates)
  else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(processPolygon)
  return shapes
}

/* ── Target colors per mode ──────────────────────────────────── */
function calcColors(
  state: StateData | undefined,
  mode: HeatmapMode,
  isSelected: boolean,
  isHovered: boolean,
): [THREE.Color, THREE.Color] {
  if (isSelected) return [new THREE.Color('#d97706'), new THREE.Color('#7a3a00')]
  if (isHovered)  return [new THREE.Color('#0284c7'), new THREE.Color('#014e7a')]
  if (!state)     return [new THREE.Color('#9ca3af'), new THREE.Color('#4b5563')]

  const lerp = (lo: THREE.Color, hi: THREE.Color, t: number) =>
    new THREE.Color().lerpColors(lo, hi, Math.min(1, Math.max(0, t)))

  if (mode === 'none') {
    const info = TERRAIN_INFO[STATE_TERRAIN[state.code] ?? 'plains']
    return [new THREE.Color(info.topColor), new THREE.Color(info.sideColor)]
  }
  let top: THREE.Color
  if      (mode === 'gdp')        top = lerp(new THREE.Color('#c8d5b9'), new THREE.Color('#2d6a1f'), state.totalGdp / 3224000)
  else if (mode === 'population') top = lerp(new THREE.Color('#bfd7ea'), new THREE.Color('#0c4a87'), state.population / 220)
  else if (mode === 'perCapita')  top = lerp(new THREE.Color('#f5e6c8'), new THREE.Color('#92400e'), (state.perCapitaIncome - 50000) / 550000)
  else                            top = lerp(new THREE.Color('#f3e8ff'), new THREE.Color('#4c1d95'), state.literacyRate / 100)

  return [top, top.clone().multiplyScalar(0.48)]
}

/* ── Target height scale ─────────────────────────────────────── */
function calcTargetScale(state: StateData | undefined, mode: HeatmapMode): number {
  if (!state) return 0.72   // BASE_DEPTH * 0.72 / BASE_DEPTH = 0.72 → depth 0.36
  let depth: number
  if (mode === 'none') {
    const info = TERRAIN_INFO[STATE_TERRAIN[state.code] ?? 'plains']
    depth = info.heightBase + (state.perCapitaIncome / 600000) * 0.16
  } else if (mode === 'gdp')        depth = 0.26 + (state.totalGdp / 3224000)                * 3.0
  else if (mode === 'population')   depth = 0.26 + (state.population / 220)                  * 2.5
  else if (mode === 'perCapita')    depth = 0.26 + ((state.perCapitaIncome - 50000) / 550000) * 2.2
  else                              depth = 0.26 + (state.literacyRate / 100)                 * 2.2
  return depth / BASE_DEPTH
}

/* ── Animated pulse rings ────────────────────────────────────── */
function PulseRings() {
  const r0 = useRef<THREE.Mesh>(null)
  const r1 = useRef<THREE.Mesh>(null)
  const r2 = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => new THREE.RingGeometry(0.9, 1.1, 48), [])

  useFrame(() => {
    const now = Date.now() / 2400
    ;[r0, r1, r2].forEach((ref, i) => {
      if (!ref.current) return
      const t = (now + i * 0.333) % 1
      ref.current.scale.set(0.3 + t * 3.0, 0.3 + t * 3.0, 1)
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.50
    })
  })

  return (
    // rings are in the parent group's XZ plane (rotation makes them lie flat)
    // placed at y = BASE_DEPTH/2 so they emerge from the state top face
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE_DEPTH / 2, 0]}>
      <mesh ref={r0} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={r1} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={r2} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

/* ── State voxel mesh ─────────────────────────────────────────── */
function StateMesh({ shapes, code, stateData, heatmapMode, isSelected, onStateClick, onHover }: {
  shapes:       THREE.Shape[]
  code:         string
  stateData?:   StateData
  heatmapMode:  HeatmapMode
  isSelected:   boolean
  onStateClick: (state: StateData) => void
  onHover:      (data: { state: StateData; x: number; y: number } | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef  = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // ── Geometry built ONCE per set of shapes (not per depth change) ──
  const geometry = useMemo(() => {
    if (!shapes.length) return null
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: BASE_DEPTH,
      bevelEnabled: true, bevelSegments: 1, bevelSize: 0.012, bevelThickness: 0.012,
    })
    geo.computeBoundingBox()
    const center = new THREE.Vector3()
    geo.boundingBox!.getCenter(center)
    geo.translate(-center.x, -center.y, -center.z)
    geo.userData.center = center.clone()
    return geo
  }, [shapes])

  // ── Reusable material refs (no recreation on mode change) ──────
  const topMat  = useRef(new THREE.MeshStandardMaterial({ roughness: 0.60, metalness: 0.04 }))
  const sideMat = useRef(new THREE.MeshStandardMaterial({ roughness: 0.92 }))

  // ── Color targets – updated when mode / selection / hover change ─
  const topTarget  = useRef(new THREE.Color())
  const sideTarget = useRef(new THREE.Color())
  const colorReady = useRef(false)

  useMemo(() => {
    const [top, side] = calcColors(stateData, heatmapMode, isSelected, hovered)
    topTarget.current.copy(top)
    sideTarget.current.copy(side)
    // Snap instantly on first mount so there's no fade-from-black
    if (!colorReady.current) {
      topMat.current.color.copy(top)
      sideMat.current.color.copy(side)
      colorReady.current = true
    }
    // Emissive: update immediately
    topMat.current.emissive.copy(
      isSelected ? top.clone().multiplyScalar(0.24) :
      hovered    ? top.clone().multiplyScalar(0.10) :
                   new THREE.Color(0)
    )
    topMat.current.emissiveIntensity = isSelected ? 0.18 : hovered ? 0.10 : 0
  }, [stateData, heatmapMode, isSelected, hovered])

  // ── Place group at base X/Z from geometry center ──────────────
  useEffect(() => {
    if (groupRef.current && geometry?.userData.center) {
      const { x, y } = geometry.userData.center   // z component used for Y world
      const flatX = x, flatZ = -y
      groupRef.current.userData.flatX = flatX
      groupRef.current.userData.flatZ = flatZ
      groupRef.current.position.set(flatX, BASE_DEPTH / 2, flatZ)
    }
  }, [geometry])

  // ── Scale / position / color animation ────────────────────────
  const scaleY   = useRef<number | null>(null)   // current lerped Y-scale
  const hoverOff = useRef(0)                     // current hover lift

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const s = Math.min(1, 8 * delta)  // lerp speed

    // ①  Target scale from current mode
    const targetScale = calcTargetScale(stateData, heatmapMode)
    if (scaleY.current === null) scaleY.current = targetScale
    scaleY.current = THREE.MathUtils.lerp(scaleY.current, targetScale, Math.min(1, 4 * delta))
    groupRef.current.scale.y = scaleY.current

    // ②  Keep base on ocean floor + hover lift
    const targetHover = isSelected ? 0.26 : hovered ? 0.12 : 0
    hoverOff.current  = THREE.MathUtils.lerp(hoverOff.current, targetHover, Math.min(1, 9 * delta))
    const targetY = scaleY.current * BASE_DEPTH / 2 + hoverOff.current
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1, 9 * delta))

    // ③  Smooth color transition
    topMat.current.color.lerp(topTarget.current,   Math.min(1, 5 * delta))
    sideMat.current.color.lerp(sideTarget.current, Math.min(1, 5 * delta))

    // ④  Emissive pulse on selected
    if (isSelected) {
      topMat.current.emissiveIntensity = 0.16 + Math.sin(Date.now() * 0.0022) * 0.08
    }
  })

  if (!geometry) return null

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={[topMat.current, sideMat.current]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow receiveShadow
        onPointerOver={e => {
          e.stopPropagation(); setHovered(true)
          if (heatmapMode === 'none') document.body.style.cursor = 'pointer'
          if (stateData) onHover({ state: stateData, x: e.clientX, y: e.clientY })
        }}
        onPointerMove={e => { if (stateData) onHover({ state: stateData, x: e.clientX, y: e.clientY }) }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; onHover(null) }}
        onClick={e => {
          e.stopPropagation()
          if (heatmapMode === 'none' && stateData) onStateClick(stateData)
        }}
      />

      {/* Border edges */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <edgesGeometry args={[geometry, 20]} />
        <lineBasicMaterial
          color={isSelected ? '#78340c' : hovered ? '#075985' : '#1c1917'}
          transparent
          opacity={isSelected ? 0.80 : hovered ? 0.65 : 0.16}
        />
      </lineSegments>

      {/* Amber pulse rings on selected (children of scaled group — ring shape is in XZ, unaffected by scale.y) */}
      {isSelected && <PulseRings />}
    </group>
  )
}

/* ── Sandy ocean floor ──────────────────────────────────────── */
function Ocean() {
  const mat = useMemo(() => {
    const size = 32
    const data = new Uint8Array(size * size * 4)
    const palette = [
      [196, 188, 174], [186, 178, 164], [204, 196, 182],
      [178, 170, 157], [210, 200, 186],
    ]
    for (let i = 0; i < size * size; i++) {
      const [r, g, b] = palette[Math.floor(Math.random() * palette.length)]
      data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=255
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.magFilter = tex.minFilter = THREE.NearestFilter
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(120, 120)
    tex.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow material={mat}>
      <planeGeometry args={[600, 600]} />
    </mesh>
  )
}

/* ── Main export ────────────────────────────────────────────── */
interface Props {
  states:        StateData[]
  selectedState: StateData | null
  heatmapMode:   HeatmapMode
  onStateClick:  (state: StateData) => void
  onHover:       (data: { state: StateData; x: number; y: number } | null) => void
}

export default function IndiaMap({ states, selectedState, heatmapMode, onStateClick, onHover }: Props) {
  const [geoFeatures, setGeoFeatures] = useState<any[]>([])

  useEffect(() => {
    fetch('/modern_india.geojson').then(r => r.json()).then(d => setGeoFeatures(d.features ?? []))
  }, [])

  const stateShapes = useMemo(() => {
    const groups: Record<string, THREE.Shape[]> = {}
    for (const f of geoFeatures) {
      const code = f.properties?.ID ?? ''
      if (!code) continue
      geometryToShapes(f.geometry).forEach(s => {
        if (!groups[code]) groups[code] = []
        groups[code].push(s)
      })
    }
    return Object.entries(groups).map(([code, shapes]) => ({ code, shapes }))
  }, [geoFeatures])

  const stateMap = useMemo(() => {
    const m: Record<string, StateData> = {}
    states.forEach(s => { m[s.code] = s })
    return m
  }, [states])

  return (
    <group>
      <Ocean />
      {stateShapes.map(({ code, shapes }) => (
        <StateMesh
          key={code}
          code={code}
          shapes={shapes}
          stateData={stateMap[code]}
          heatmapMode={heatmapMode}
          isSelected={selectedState?.code === code}
          onStateClick={onStateClick}
          onHover={onHover}
        />
      ))}
    </group>
  )
}
