import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geoMercator } from 'd3-geo'

function coordsToShape(coords: number[][], projection: any): THREE.Shape | null {
  const shape = new THREE.Shape()
  let started = false
  for (const [lng, lat] of coords) {
    const p = projection([lng, lat])
    if (!p) continue
    const x = p[0]
    const y = -p[1]
    if (!started) { shape.moveTo(x, y); started = true }
    else shape.lineTo(x, y)
  }
  if (!started) return null
  shape.closePath()
  return shape
}

function geometryToShapes(geometry: any, projection: any): THREE.Shape[] {
  const shapes: THREE.Shape[] = []
  if (geometry.type === 'Polygon') {
    const outer = coordsToShape(geometry.coordinates[0], projection)
    if (outer) {
      for (let i = 1; i < geometry.coordinates.length; i++) {
        const hole = coordsToShape(geometry.coordinates[i], projection)
        if (hole) {
          const holePath = new THREE.Path(hole.getPoints())
          outer.holes.push(holePath)
        }
      }
      shapes.push(outer)
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      const outer = coordsToShape(polygon[0], projection)
      if (outer) {
        for (let i = 1; i < polygon.length; i++) {
          const hole = coordsToShape(polygon[i], projection)
          if (hole) {
            const holePath = new THREE.Path(hole.getPoints())
            outer.holes.push(holePath)
          }
        }
        shapes.push(outer)
      }
    }
  }
  return shapes
}

// Minecraft color palette for states
const MC_COLORS = {
  default: '#4a8c2a',    // Grass green
  hover: '#5da033',
  selected: '#55FF55',
  myOwned: '#2d6e12',    // Dark green (you own it)
  forSale: '#c9a84c',    // Gold (available)
  otherOwned: '#8b4040', // Dark red (enemy)
}

function StateMesh({ shapes, code, stateData, currentUser, isSelected, onStateClick, onHover }: any) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  const geometry = useMemo(() => {
    if (!shapes || shapes.length === 0) return null
    const extrudeSettings = {
      depth: 0.5,
      bevelEnabled: false,
      curveSegments: 1, // Maximum blockiness
      steps: 1,
    }
    const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings)
    geo.computeBoundingBox()
    const center = new THREE.Vector3()
    geo.boundingBox?.getCenter(center)
    geo.translate(-center.x, -center.y, -center.z)
    geo.userData.center = center
    return geo
  }, [shapes])

  useEffect(() => {
    if (groupRef.current && geometry && geometry.userData.center) {
      const { x, y, z } = geometry.userData.center
      groupRef.current.position.set(x, z, -y)
      groupRef.current.userData.baseY = z
    }
  }, [geometry])

  const ownershipInfo = useMemo(() => {
    if (!stateData?.cities) return { myOwned: 0, othersOwned: 0, forSale: 0, total: 0 }
    const cities = stateData.cities
    const myOwned = cities.filter((d: any) => d.ownerId === currentUser?.id).length
    const othersOwned = cities.filter((d: any) => d.ownerId && d.ownerId !== currentUser?.id).length
    const forSale = cities.filter((d: any) => d.isForSale).length
    return { myOwned, othersOwned, forSale, total: cities.length }
  }, [stateData, currentUser])

  const topColor = useMemo(() => {
    if (isSelected) return MC_COLORS.selected
    if (hovered) return MC_COLORS.hover
    const { myOwned, othersOwned, forSale, total } = ownershipInfo
    if (total > 0 && myOwned > 0) return MC_COLORS.myOwned
    if (total > 0 && forSale > 0) return MC_COLORS.forSale
    if (total > 0 && othersOwned > 0) return MC_COLORS.otherOwned
    return MC_COLORS.default
  }, [isSelected, hovered, ownershipInfo])

  // Top face = grass color, side face = dirt brown
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: topColor, roughness: 1, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: '#866043', roughness: 1, metalness: 0 }),
  ], [topColor])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const baseY = groupRef.current.userData.baseY || 0
    const lift = isSelected ? 0.25 : hovered ? 0.03 : 0
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseY + lift, 4 * delta)
  })

  if (!geometry) return null

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        material={materials}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
          if (stateData) onHover({
            name: stateData.name || code,
            gdp: stateData.totalGdp || 0,
            owned: ownershipInfo.myOwned,
            total: ownershipInfo.total,
            x: e.clientX || 0,
            y: e.clientY || 0,
          })
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
          onHover(null)
        }}
        onClick={(e) => {
          e.stopPropagation()
          onStateClick(code)
        }}
        castShadow
        receiveShadow
      />
      {/* Black outline edges for blocky Minecraft look */}
      {geometry && (
        <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[geometry, 15]} />
          <lineBasicMaterial color="#111" transparent opacity={0.6} />
        </lineSegments>
      )}
    </group>
  )
}

function MinecraftOcean() {
  const ref = useRef<THREE.Mesh>(null)

  // Animate water UVs for subtle movement
  useFrame(() => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial
      if (mat.map) {
        mat.map.offset.x += 0.0001
        mat.map.offset.y += 0.00005
      }
    }
  })

  const waterMat = useMemo(() => {
    const size = 16
    const data = new Uint8Array(size * size * 4)
    const blues = [
      new THREE.Color('#2b65d1'),
      new THREE.Color('#3a6dd4'),
      new THREE.Color('#2558b8'),
      new THREE.Color('#3f76e4'),
    ]
    for (let i = 0; i < size * size; i++) {
      const c = blues[Math.floor(Math.random() * blues.length)]
      data[i*4] = c.r * 255; data[i*4+1] = c.g * 255; data[i*4+2] = c.b * 255; data[i*4+3] = 255
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(300, 300)
    tex.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 })
  }, [])

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} material={waterMat}>
      <planeGeometry args={[600, 600]} />
    </mesh>
  )
}

export default function IndiaMap({ states, selectedState, currentUser, onStateClick, onHover }: any) {
  const [geoFeatures, setGeoFeatures] = useState<any[]>([])

  useEffect(() => {
    fetch('/modern_india.geojson')
      .then(r => r.json())
      .then(geoData => {
        setGeoFeatures(geoData.features || [])
      })
      .catch(err => console.error('Failed to load GeoJSON:', err))
  }, [])

  const projection = useMemo(() => {
    return geoMercator().center([82, 23]).scale(20).translate([0, 0])
  }, [])

  const stateShapes = useMemo(() => {
    if (!geoFeatures.length) return []
    const groups: Record<string, THREE.Shape[]> = {}
    for (const feature of geoFeatures) {
      const code = feature.properties?.ID || ''
      if (!code) continue
      const shapes = geometryToShapes(feature.geometry, projection)
      if (!shapes.length) continue
      if (!groups[code]) groups[code] = []
      groups[code].push(...shapes)
    }
    return Object.entries(groups).map(([code, shapes]) => ({ code, shapes }))
  }, [geoFeatures, projection])

  const stateDataMap = useMemo(() => {
    const map: Record<string, any> = {}
    states.forEach((s: any) => { map[s.code] = s })
    return map
  }, [states])

  // Minecraft-style blocky clouds
  const clouds = useMemo(() => {
    const arr = []
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 80
      const z = (Math.random() - 0.5) * 80
      const w = Math.floor(Math.random() * 4) + 3
      const d = Math.floor(Math.random() * 3) + 2
      arr.push({ x, z, w, d, speed: 0.003 + Math.random() * 0.005 })
    }
    return arr
  }, [])

  return (
    <group>
      <MinecraftOcean />

      {/* Blocky sun */}
      <mesh position={[40, 30, -40]}>
        <boxGeometry args={[6, 6, 0.5]} />
        <meshBasicMaterial color="#ffffa0" />
      </mesh>
      <pointLight position={[40, 30, -40]} intensity={0.5} distance={100} color="#ffffa0" />

      {/* Minecraft clouds */}
      {clouds.map((c, i) => (
        <group key={`cloud-${i}`} position={[c.x, 18, c.z]}>
          {Array.from({ length: c.w }).map((_, bx) =>
            Array.from({ length: c.d }).map((_, bz) => (
              <mesh key={`${bx}-${bz}`} position={[bx - c.w/2, 0, bz - c.d/2]}>
                <boxGeometry args={[1, 0.5, 1]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))
          )}
        </group>
      ))}

      {stateShapes.map(({ code, shapes }) => (
        <StateMesh
          key={code}
          code={code}
          shapes={shapes}
          stateData={stateDataMap[code]}
          currentUser={currentUser}
          isSelected={selectedState?.code === code}
          onStateClick={onStateClick}
          onHover={onHover}
        />
      ))}
    </group>
  )
}
