import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// State positions for map zoom
const STATE_POSITIONS: Record<string, [number, number, number]> = {
  AP: [0.7, 0, 2.3], AR: [4.2, 0, -3.2], AS: [3.8, 0, -2.5],
  BR: [2.0, 0, -1.5], CT: [1.2, 0, 0.5], GA: [-1.2, 0, 2.6],
  GJ: [-2.5, 0, 0.8], HR: [-0.5, 0, -2.8], HP: [0.0, 0, -3.6],
  JH: [2.0, 0, -0.8], KA: [-0.3, 0, 3.0], KL: [-0.2, 0, 3.8],
  MP: [0.0, 0, -0.2], MH: [-0.8, 0, 1.5], MN: [4.5, 0, -1.8],
  ML: [3.5, 0, -2.3], MZ: [4.3, 0, -1.3], NL: [4.5, 0, -2.2],
  OR: [1.7, 0, 1.0], PB: [-0.8, 0, -3.0], RJ: [-1.8, 0, -1.5],
  SK: [3.2, 0, -2.8], TN: [0.3, 0, 3.8], TG: [0.6, 0, 1.8],
  TR: [3.8, 0, -1.0], UP: [0.8, 0, -1.8], UT: [0.3, 0, -3.0],
  WB: [2.5, 0, -0.3], AN: [4.0, 0, 3.5], CH: [-0.5, 0, -3.0],
  DN: [-2.0, 0, 1.2], DL: [-0.2, 0, -2.5], JK: [-0.8, 0, -4.5],
  LA: [0.5, 0, -5.5], LD: [-1.5, 0, 4.0], PY: [0.3, 0, 3.5],
  DD: [-2.0, 0, 1.5],
}

// Island camera positions: [camX, camY, camZ, lookX, lookY, lookZ]
const ISLAND_POSITIONS: Record<string, [number, number, number, number, number, number]> = {
  ISLAND_CHEST:   [-10, 3, 13, -10, 0.3, 10],
  ISLAND_AUCTION: [12, 3, 14, 12, 0.3, 10],
  ISLAND_TRADE:   [10, 3, -3, 10, 0.3, -7],
  ISLAND_EMPIRE:  [-10, 3, -3, -10, 0.3, -7],
}

// Default overview position
const DEFAULT_POS = new THREE.Vector3(0, 14, 20)
const DEFAULT_LOOK = new THREE.Vector3(0, 0, 0)

export default function CameraController({ target }: { target: string | null }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const targetPos = useRef(DEFAULT_POS.clone())
  const targetLookAt = useRef(DEFAULT_LOOK.clone())
  const currentLookAt = useRef(DEFAULT_LOOK.clone())
  const arrived = useRef(true)
  const isUserInteracting = useRef(false)

  // Track if user is manually controlling the camera
  useEffect(() => {
    const onStart = () => { isUserInteracting.current = true }
    const onEnd = () => { isUserInteracting.current = false }
    const ctrl = controlsRef.current
    if (ctrl) {
      ctrl.addEventListener('start', onStart)
      ctrl.addEventListener('end', onEnd)
      return () => {
        ctrl.removeEventListener('start', onStart)
        ctrl.removeEventListener('end', onEnd)
      }
    }
  })

  useEffect(() => {
    if (target && ISLAND_POSITIONS[target]) {
      const [cx, cy, cz, lx, ly, lz] = ISLAND_POSITIONS[target]
      targetPos.current.set(cx, cy, cz)
      targetLookAt.current.set(lx, ly, lz)
    } else if (target && STATE_POSITIONS[target]) {
      const [x, , z] = STATE_POSITIONS[target]
      targetPos.current.set(x, 10, z + 8)
      targetLookAt.current.set(x, 0, z)
    } else {
      // Reset to overview
      targetPos.current.copy(DEFAULT_POS)
      targetLookAt.current.copy(DEFAULT_LOOK)
    }
    arrived.current = false
    isUserInteracting.current = false
  }, [target])

  useFrame((_, delta) => {
    // Skip animation if user is actively controlling or camera has arrived
    if (arrived.current || isUserInteracting.current) return

    const speed = Math.min(3 * delta, 0.15) // Clamp speed to prevent jumps on lag spikes
    camera.position.lerp(targetPos.current, speed)
    currentLookAt.current.lerp(targetLookAt.current, speed)

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, speed)
    }

    // Stop once close enough
    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      arrived.current = true
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={2}
      maxDistance={50}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.1}
      enableDamping={false}
      rotateSpeed={0.45}
      panSpeed={0.8}
      zoomSpeed={1.0}
      screenSpacePanning={true}
    />
  )
}
