import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { INDIA_STATES_DATA, StateData } from './data/indiaData'
import IndiaMap from './components/IndiaMap'
import CameraController from './components/CameraController'
import StatePanel from './components/StatePanel'
import MapControls from './components/MapControls'
import HoverTooltip from './components/HoverTooltip'

export type HeatmapMode = 'none' | 'gdp' | 'population' | 'perCapita' | 'literacy'

export default function App() {
  const [selected, setSelected]   = useState<StateData | null>(null)
  const [mode, setMode]           = useState<HeatmapMode>('none')
  const [hover, setHover]         = useState<{ state: StateData; x: number; y: number } | null>(null)
  const [camTarget, setCamTarget] = useState<string | null>(null)

  const handleSelect = useCallback((state: StateData) => {
    setSelected(prev => {
      const isSame = prev?.code === state.code
      setCamTarget(isSame ? null : state.code)
      return isSame ? null : state
    })
  }, [])

  const handleClose = useCallback(() => {
    setSelected(null)
    setCamTarget(null)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--canvas-bg)' }}>
      {/* 3D canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 14, 20], fov: 44 }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Warm cream sky */}
        <color attach="background" args={['#ddd8cf']} />

        {/* Bright midday lighting */}
        <ambientLight intensity={1.3} color="#fffef8" />
        <directionalLight
          position={[30, 50, 20]}
          intensity={2.0}
          color="#fff9ec"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0004}
        />
        {/* Cool fill light from opposite side */}
        <directionalLight position={[-20, 20, -25]} intensity={0.5} color="#d4e8f5" />
        {/* Warm bounce from below */}
        <pointLight position={[0, -5, 0]} intensity={0.3} color="#f5e6c8" />

        <CameraController target={camTarget} />
        <IndiaMap
          states={INDIA_STATES_DATA}
          selectedState={selected}
          heatmapMode={mode}
          onStateClick={handleSelect}
          onHover={setHover}
        />
      </Canvas>

      {/* UI overlays */}
      <MapControls mode={mode} onMode={setMode} />

      {/* Hover tooltip — only when no state selected */}
      {hover && !selected && <HoverTooltip data={hover} />}

      {/* State detail panel */}
      {selected && <StatePanel state={selected} onClose={handleClose} />}
    </div>
  )
}
