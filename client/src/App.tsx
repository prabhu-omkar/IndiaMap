import { useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import api from './api'
import socket from './socket'
import Auth from './components/Auth'
import IndiaMap from './components/IndiaMap'
import TopBar from './components/TopBar'
import DistrictPanel from './components/DistrictPanel'
import DailyChest from './components/DailyChest'
import AuctionHouse from './components/AuctionHouse'
import TradePanel from './components/TradePanel'
import MyEmpire from './components/MyEmpire'
import CameraController from './components/CameraController'
import Islands from './components/Islands'

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [states, setStates] = useState<any[]>([])
  const [selectedState, setSelectedState] = useState<any>(null)
  const [tooltip, setTooltip] = useState<any>(null)
  const [cameraTarget, setCameraTarget] = useState<string | null>(null)
  const [showChest, setShowChest] = useState(false)
  const [showAuctions, setShowAuctions] = useState(false)
  const [showTrades, setShowTrades] = useState(false)
  const [showEmpire, setShowEmpire] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('bidindia_token')
    if (token) {
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => {
        localStorage.removeItem('bidindia_token')
      })
    }
  }, [])

  const loadData = useCallback(() => {
    api.get('/states').then(r => setStates(r.data)).catch(() => {})
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    socket.on('city_update', () => {
      loadData()
      if (user) api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
    })
    socket.on('daily_income', (data: any) => {
      showNotif(data.message)
      loadData()
      if (user) api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
    })
    socket.on('auction_update', () => { loadData() })
    socket.on('trade_update', () => {
      if (user) api.get('/auth/me').then(r => setUser(r.data)).catch(() => {})
    })
    return () => {
      socket.off('city_update')
      socket.off('daily_income')
      socket.off('auction_update')
      socket.off('trade_update')
    }
  }, [user, loadData])

  const showNotif = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('bidindia_token', token)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('bidindia_token')
    setUser(null)
  }

  const closeAllPanels = () => {
    setShowChest(false); setShowAuctions(false); setShowTrades(false); setShowEmpire(false)
    setSelectedState(null)
  }

  const handleStateClick = useCallback((stateCode: string) => {
    const found = states.find(s => s.code === stateCode)
    if (found) {
      setSelectedState(found)
      setCameraTarget(stateCode)
      setShowChest(false); setShowAuctions(false); setShowTrades(false); setShowEmpire(false)
    }
  }, [states])

  const handleClosePanel = () => {
    setSelectedState(null)
    setCameraTarget(null)
  }

  const handleAction = async () => {
    await loadData()
    if (user) {
      const r = await api.get('/auth/me')
      setUser(r.data)
    }
    if (selectedState) {
      const r = await api.get(`/states/${selectedState.id}`)
      setSelectedState(r.data)
    }
  }

  const handleChestClick = () => { closeAllPanels(); setShowChest(true); setCameraTarget('ISLAND_CHEST') }
  const handleAuctionClick = () => { closeAllPanels(); setShowAuctions(true); setCameraTarget('ISLAND_AUCTION') }
  const handleTradeClick = () => { closeAllPanels(); setShowTrades(true); setCameraTarget('ISLAND_TRADE') }
  const handleEmpireClick = () => { closeAllPanels(); setShowEmpire(true); setCameraTarget('ISLAND_EMPIRE') }

  if (!user) return <Auth onLogin={handleLogin} />

  return (
    <>
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 14, 20], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          shadows
        >
          <color attach="background" args={['#78A7FF']} />
          <ambientLight intensity={0.9} color="#FFFFFF" />
          <directionalLight
            position={[15, 25, 10]}
            intensity={1.3}
            color="#FFFCF5"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={60}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-15, 15, -15]} intensity={0.4} color="#E8E0D4" />
          
          <IndiaMap
            states={states}
            selectedState={selectedState}
            currentUser={user}
            onStateClick={handleStateClick}
            onHover={setTooltip}
          />

          <Islands
            onChestClick={handleChestClick}
            onAuctionClick={handleAuctionClick}
            onTradeClick={handleTradeClick}
            onEmpireClick={handleEmpireClick}
            chestOpen={showChest}
          />

          <CameraController target={cameraTarget} />
        </Canvas>
      </div>

      <div className="overlay">
        <TopBar
          user={user}
          onLogout={handleLogout}
          onChest={handleChestClick}
          onAuctions={handleAuctionClick}
          onTrades={handleTradeClick}
          onEmpire={handleEmpireClick}
        />

        {selectedState && (
          <DistrictPanel
            state={selectedState}
            user={user}
            onClose={handleClosePanel}
          />
        )}

        {showChest && (
          <DailyChest
            user={user}
            onClose={() => { setShowChest(false); setCameraTarget(null) }}
            onAction={handleAction}
            showNotif={showNotif}
          />
        )}

        {showAuctions && (
          <AuctionHouse
            user={user}
            onClose={() => { setShowAuctions(false); setCameraTarget(null) }}
            onAction={handleAction}
            showNotif={showNotif}
          />
        )}

        {showTrades && (
          <TradePanel
            user={user}
            onClose={() => { setShowTrades(false); setCameraTarget(null) }}
            onAction={handleAction}
            showNotif={showNotif}
          />
        )}

        {showEmpire && (
          <MyEmpire
            user={user}
            onClose={() => { setShowEmpire(false); setCameraTarget(null) }}
            onAction={handleAction}
            showNotif={showNotif}
          />
        )}
      </div>

      {tooltip && (
        <div className="state-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tt-name">{tooltip.name}</div>
          <div className="tt-gdp">GDP: ₹{(tooltip.gdp).toLocaleString()} Cr</div>
          {tooltip.owned > 0 && <div className="tt-owned">{tooltip.owned}/{tooltip.total} cities owned</div>}
        </div>
      )}

      {notification && (
        <div className="notification">
          <div>💰</div>
          <div>{notification}</div>
        </div>
      )}
    </>
  )
}
