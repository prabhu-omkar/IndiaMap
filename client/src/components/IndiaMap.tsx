import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geoMercator } from 'd3-geo'
import { StateData } from '../data/indiaData'
import { STATE_TERRAIN, TERRAIN_INFO } from '../data/terrainData'
import { HeatmapMode } from '../App'

const projection = geoMercator().center([82, 23]).scale(20).translate([0, 0])

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
  if (geometry.type === 'Polygon')      processPolygon(geometry.coordinates)
  else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(processPolygon)
  return shapes
}

/* ── Target colors for modes ──────────────────────────────────── */
function getStateColors(
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
  if (mode === 'gdp')        top = lerp(new THREE.Color('#c8d5b9'), new THREE.Color('#2d6a1f'), state.totalGdp / 3224000)
  else if (mode === 'population') top = lerp(new THREE.Color('#bfd7ea'), new THREE.Color('#0c4a87'), state.population / 220)
  else if (mode === 'perCapita')  top = lerp(new THREE.Color('#f5e6c8'), new THREE.Color('#92400e'), (state.perCapitaIncome - 50000) / 550000)
  else /* literacy */             top = lerp(new THREE.Color('#f3e8ff'), new THREE.Color('#4c1d95'), state.literacyRate / 100)

  return [top, top.clone().multiplyScalar(0.48)]
}

/* ── Target depth for modes ──────────────────────────────────── */
function calcDepth(state: StateData | undefined, mode: HeatmapMode): number {
  if (!state) return 0.36
  if (mode === 'none') {
    const base = TERRAIN_INFO[STATE_TERRAIN[state.code] ?? 'plains'].heightBase
    return base + (state.perCapitaIncome / 600000) * 0.16
  }
  if (mode === 'gdp')        return 0.26 + (state.totalGdp / 3224000)        * 3.0
  if (mode === 'population') return 0.26 + (state.population / 220)          * 2.5
  if (mode === 'perCapita')  return 0.26 + ((state.perCapitaIncome - 50000) / 550000) * 2.2
  /* literacy */             return 0.26 + (state.literacyRate / 100)        * 2.2
}

/* ── Pulse rings on selected state ───────────────────────────── */
function PulseRings({ baseY }: { baseY: number }) {
  const r0 = useRef<THREE.Mesh>(null)
  const r1 = useRef<THREE.Mesh>(null)
  const r2 = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => new THREE.RingGeometry(0.9, 1.1, 48), [])

  useFrame(() => {
    const now = Date.now() / 2400
    ;[r0, r1, r2].forEach((ref, i) => {
      if (!ref.current) return
      const t = (now + i * 0.333) % 1
      const s = 0.3 + t * 3.0
      ref.current.scale.set(s, s, 1)
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.50
    })
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY + 0.08, 0]}>
      <mesh ref={r0} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={r1} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={r2} geometry={geo}><meshBasicMaterial color="#d97706" transparent side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

/* ── Individual state block ──────────────────────────────────── */
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
  const currentDepth = useRef<number>(calcDepth(stateData, heatmapMode))

  // Constant base geometry (depth 1.0), height scaled smoothly via mesh.scale.z
  const geometry = useMemo(() => {
    if (!shapes.length) return null
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 1.0,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    })
    geo.computeBoundingBox()
    const center = new THREE.Vector3()
    geo.boundingBox!.getCenter(center)
    geo.translate(-center.x, -center.y, 0)
    geo.userData.center = new THREE.Vector3(center.x, center.y, 0)
    return geo
  }, [shapes])

  // Create persistent materials for smooth color lerping
  const [topColor, sideColor] = useMemo(
    () => getStateColors(stateData, heatmapMode, isSelected, hovered),
    [stateData, heatmapMode, isSelected, hovered]
  )

  const [topMat, sideMat] = useMemo(() => [
    new THREE.MeshStandardMaterial({
      color: topColor.clone(),
      roughness: 0.60,
      metalness: 0.04,
    }),
    new THREE.MeshStandardMaterial({
      color: sideColor.clone(),
      roughness: 0.92,
    }),
  ], [shapes])

  useEffect(() => {
    if (groupRef.current && geometry?.userData.center) {
      const { x, y } = geometry.userData.center
      groupRef.current.position.set(x, 0, -y)
      groupRef.current.userData.baseY = 0
    }
  }, [geometry])

  // Smooth frame-by-frame animation for height + colors + hover lift
  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current) return

    // 1. Smooth height extrusion lerp across modes
    const targetDepth = calcDepth(stateData, heatmapMode)
    currentDepth.current = THREE.MathUtils.lerp(currentDepth.current, targetDepth, 7 * delta)
    meshRef.current.scale.set(1, 1, currentDepth.current)

    // 2. Smooth position float for hover & selection
    const base = groupRef.current.userData.baseY ?? 0
    const floatTarget = isSelected ? base + 0.26 : hovered ? base + 0.12 : base
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, floatTarget, 9 * delta)

    // 3. Smooth color morphing across modes & states
    const [targetTop, targetSide] = getStateColors(stateData, heatmapMode, isSelected, hovered)
    topMat.color.lerp(targetTop, 7 * delta)
    sideMat.color.lerp(targetSide, 7 * delta)

    // 4. Smooth emissive pulse
    if (isSelected) {
      topMat.emissive.lerp(targetTop.clone().multiplyScalar(0.24), 7 * delta)
      topMat.emissiveIntensity = 0.18 + Math.sin(Date.now() * 0.0022) * 0.08
    } else if (hovered) {
      topMat.emissive.lerp(targetTop.clone().multiplyScalar(0.10), 7 * delta)
      topMat.emissiveIntensity = 0.10
    } else {
      topMat.emissive.setRGB(0, 0, 0)
      topMat.emissiveIntensity = 0
    }
  })

  if (!geometry) return null

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={[topMat, sideMat]}
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
          if (heatmapMode === 'none' && stateData) {
            onStateClick(stateData)
          }
        }}
      />
      <lineSegments ref={meshRef => { if (meshRef && groupRef.current) meshRef.scale.set(1, 1, currentDepth.current) }} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <edgesGeometry args={[geometry, 20]} />
        <lineBasicMaterial
          color={isSelected ? '#78340c' : hovered ? '#075985' : '#1c1917'}
          transparent
          opacity={isSelected ? 0.80 : hovered ? 0.65 : 0.16}
        />
      </lineSegments>
      {isSelected && <PulseRings baseY={currentDepth.current / 2} />}
    </group>
  )
}

/* ── Sandy ocean floor ───────────────────────────────────────── */
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow material={mat}>
      <planeGeometry args={[600, 600]} />
    </mesh>
  )
}

/* ── Main export ─────────────────────────────────────────────── */
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
      const shapes = geometryToShapes(f.geometry)
      if (!groups[code]) groups[code] = []
      groups[code].push(...shapes)
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
