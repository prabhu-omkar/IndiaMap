import { useRef, useMemo, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const S = 0.22 // Smaller scale

const MC = {
  grass:'#4a8c2a', dirt:'#866043', stone:'#7d7d7d', cobble:'#636363',
  planks:'#b38f56', log:'#5c4528', leaves:'#2d6e12', chest:'#825e36',
  chestDark:'#694827', iron:'#8b8b8b', gold:'#f5d442', glass:'#96d1e5',
  woolRed:'#a12722', woolWhite:'#e9ecec', torch:'#c87e2e',
  brick:'#9b4f35', obsidian:'#1d1025', sand:'#dbd3a0',
  glowstone:'#f0c848', mossy:'#4a7a3a', gravel:'#8a8078',
  spruce:'#3a2a1a', darkLeaves:'#1a4a10', water:'#3f76e4',
}

// Shared geometry — one instance for ALL blocks
const sharedBox = new THREE.BoxGeometry(1, 1, 1)

// Material cache — one material per unique color
const matCache = new Map<string, THREE.MeshStandardMaterial>()
function getMat(c: string) {
  if (!matCache.has(c)) {
    matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0 }))
  }
  return matCache.get(c)!
}

const B = memo(function B({ p, c }: { p:[number,number,number]; c:string }) {
  return <mesh position={p} geometry={sharedBox} material={getMat(c)} castShadow receiveShadow />
})

// Organic island shape — circle with random bumps
function IslandBase({ radius=6 }: { radius?:number }) {
  const blocks = useMemo(() => {
    const b: { p:[number,number,number]; c:string }[] = []
    for (let x = -radius-1; x <= radius+1; x++) {
      for (let z = -radius-1; z <= radius+1; z++) {
        const dist = Math.sqrt(x*x + z*z)
        const edge = radius + Math.sin(x*0.8)*1.2 + Math.cos(z*1.1)*0.8
        if (dist > edge) continue
        b.push({ p:[x,0,z], c: MC.grass })
        b.push({ p:[x,-1,z], c: MC.dirt })
        b.push({ p:[x,-2,z], c: MC.dirt })
        b.push({ p:[x,-3,z], c: MC.stone })
        // Hanging rocks
        if (dist < edge - 1 && Math.random() > 0.85) {
          b.push({ p:[x,-4,z], c: MC.stone })
          if (Math.random() > 0.5) b.push({ p:[x,-5,z], c: MC.cobble })
        }
      }
    }
    // Random flowers, grass tufts
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * (radius - 2)
      const fx = Math.round(Math.cos(angle)*r)
      const fz = Math.round(Math.sin(angle)*r)
      const colors = ['#e04040','#e0e040','#4040e0','#e080e0','#40e0e0']
      b.push({ p:[fx,1,fz], c: colors[i%colors.length] })
    }
    return b
  }, [radius])
  return <>{blocks.map((b,i) => <B key={i} p={b.p} c={b.c}/>)}</>
}

function OakTree({ pos }: { pos:[number,number,number] }) {
  const blocks = useMemo(() => {
    // Generate deterministic height based on coordinates so it never changes
    const hash = Math.abs(Math.sin(pos[0] * 12.9898 + pos[2] * 78.233) * 43758.5453) % 1
    const h = 4 + Math.floor(hash * 2)
    
    const b: { p:[number,number,number]; c:string }[] = []
    for (let y=1; y<=h; y++) b.push({p:[pos[0],pos[1]+y,pos[2]], c:MC.log})
    for (let lx=-2; lx<=2; lx++) for (let lz=-2; lz<=2; lz++) {
      if (Math.abs(lx)+Math.abs(lz)<=3) {
        b.push({p:[pos[0]+lx,pos[1]+h,pos[2]+lz], c:MC.leaves})
        if (Math.abs(lx)+Math.abs(lz)<=2) b.push({p:[pos[0]+lx,pos[1]+h+1,pos[2]+lz], c:MC.leaves})
      }
    }
    b.push({p:[pos[0],pos[1]+h+2,pos[2]], c:MC.leaves})
    return b
  }, [pos[0], pos[1], pos[2]])
  return <>{blocks.map((b,i)=><B key={i} p={b.p} c={b.c}/>)}</>
}

// ═══ CHEST ISLAND — Forest clearing ═══
function ChestIsland({ isOpen, onClick }: any) {
  const lidRef = useRef<THREE.Group>(null)
  useFrame((_,d) => {
    if (lidRef.current) {
      const t = isOpen ? -Math.PI/2 : 0
      lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, t, 6*d)
    }
  })

  const deco = useMemo(() => {
    const b: { p:[number,number,number]; c:string }[] = []
    // Cobblestone circle around chest
    for (let a=0; a<12; a++) {
      const angle = (a/12)*Math.PI*2
      b.push({p:[Math.round(Math.cos(angle)*2),1,Math.round(Math.sin(angle)*2)], c:MC.cobble})
    }
    // Mossy stones
    b.push({p:[-1,1,3], c:MC.mossy}); b.push({p:[2,1,-2], c:MC.mossy})
    // Lantern posts
    ;[[-3,3],[ 3,3]].forEach(([x,z]) => {
      b.push({p:[x,1,z], c:MC.cobble}); b.push({p:[x,2,z], c:MC.cobble}); b.push({p:[x,3,z], c:MC.glowstone})
    })
    // Gravel path
    for (let z=3; z<=6; z++) { b.push({p:[0,1,z], c:MC.gravel}); b.push({p:[1,1,z], c:MC.gravel}) }
    return b
  }, [])

  return (
    <group>
      <IslandBase radius={7}/>
      {deco.map((b,i)=><B key={`d${i}`} p={b.p} c={b.c}/>)}
      <OakTree pos={[-4,0,-3]}/><OakTree pos={[4,0,-4]}/><OakTree pos={[-5,0,2]}/>
      <OakTree pos={[5,0,1]}/><OakTree pos={[-2,0,-5]}/>

      {/* Chest */}
      <group position={[0,1,0]} onClick={e=>{e.stopPropagation();onClick()}}>
        <mesh position={[0,0.32,0]} castShadow><boxGeometry args={[0.875,0.625,0.875]}/><meshStandardMaterial color={MC.chest} roughness={1}/></mesh>
        <group position={[0,0.625,-0.44]} ref={lidRef}>
          <mesh position={[0,0.15,0.44]} castShadow><boxGeometry args={[0.875,0.31,0.875]}/><meshStandardMaterial color={MC.chestDark} roughness={1}/></mesh>
          <mesh position={[0,0,0.9]} castShadow><boxGeometry args={[0.12,0.25,0.06]}/><meshStandardMaterial color={MC.iron} roughness={0.5} metalness={0.6}/></mesh>
        </group>
        {isOpen && <pointLight position={[0,0.8,0]} intensity={3} distance={4} color="#FFD700"/>}
      </group>
      <pointLight position={[-3,4,3]} intensity={1.5} distance={6} color="#FFD080"/>
      <pointLight position={[3,4,3]} intensity={1.5} distance={6} color="#FFD080"/>
    </group>
  )
}

// ═══ AUCTION ISLAND — Castle with towers, moat, bridge ═══
function AuctionCastle() {
  const blocks = useMemo(() => {
    const b: { p:[number,number,number]; c:string }[] = []

    // Castle walls (hollow octagon-ish)
    for (let x=-3; x<=3; x++) for (let z=-3; z<=3; z++) {
      const isWall = x===-3||x===3||z===-3||z===3
      const isDoor = x===0 && z===3
      const isCorner = (Math.abs(x)===3 && Math.abs(z)===3)
      if (isWall && !isDoor) {
        for (let y=1; y<=4; y++) b.push({p:[x,y,z], c: isCorner ? MC.stone : MC.cobble})
        if ((x+z)%2===0) b.push({p:[x,5,z], c:MC.cobble}) // Crenels
      }
      if (!isWall) b.push({p:[x,1,z], c:MC.planks}) // Floor
    }

    // 4 corner towers (taller, with roofs)
    ;[[-3,-3],[3,-3],[-3,3],[3,3]].forEach(([cx,cz]) => {
      for (let y=1; y<=8; y++) {
        b.push({p:[cx,y,cz], c:MC.stone})
        if (y<=6) { b.push({p:[cx+(cx<0?-1:1),y,cz], c:MC.stone}); b.push({p:[cx,y,cz+(cz<0?-1:1)], c:MC.stone}) }
      }
      // Pointed roof
      b.push({p:[cx,9,cz], c:MC.spruce}); b.push({p:[cx+(cx<0?-1:1),8,cz], c:MC.spruce})
      b.push({p:[cx,8,cz+(cz<0?-1:1)], c:MC.spruce}); b.push({p:[cx,10,cz], c:MC.torch})
    })

    // Windows
    ;[[-3,3,0],[3,3,0],[0,3,-3],[-3,3,-1],[3,3,1]].forEach(p => b.push({p:p as [number,number,number], c:MC.glass}))

    // Entrance arch + door
    b.push({p:[-1,3,3], c:MC.stone}); b.push({p:[1,3,3], c:MC.stone})
    b.push({p:[-1,4,3], c:MC.stone}); b.push({p:[0,4,3], c:MC.stone}); b.push({p:[1,4,3], c:MC.stone})

    // Banners
    b.push({p:[-1,5,3], c:MC.log}); b.push({p:[-1,6,3], c:MC.woolRed})
    b.push({p:[1,5,3], c:MC.log}); b.push({p:[1,6,3], c:MC.woolRed})

    // Interior: podium + throne
    b.push({p:[0,2,-2], c:MC.planks}); b.push({p:[0,3,-2], c:MC.gold})
    b.push({p:[-1,2,-2], c:MC.planks}); b.push({p:[1,2,-2], c:MC.planks})

    // Bridge
    for (let z=4; z<=6; z++) { b.push({p:[-1,1,z], c:MC.planks}); b.push({p:[0,1,z], c:MC.planks}); b.push({p:[1,1,z], c:MC.planks}) }
    // Bridge rails
    b.push({p:[-1,2,4], c:MC.log}); b.push({p:[-1,2,6], c:MC.log})
    b.push({p:[1,2,4], c:MC.log}); b.push({p:[1,2,6], c:MC.log})

    // Moat (water blocks around castle)
    for (let x=-5; x<=5; x++) for (let z=-5; z<=5; z++) {
      const dist = Math.max(Math.abs(x), Math.abs(z))
      if (dist===4 || dist===5) {
        if (x>=- 1 && x<=1 && z>=4) continue // Bridge gap
        b.push({p:[x,0,z], c:MC.water})
      }
    }

    return b
  }, [])

  return (
    <group>
      <IslandBase radius={7}/>
      {blocks.map((b,i)=><B key={i} p={b.p} c={b.c}/>)}
      <OakTree pos={[-6,0,-5]}/><OakTree pos={[6,0,-5]}/>
      {[[-4,10,-4],[4,10,-4],[-4,10,4],[4,10,4]].map((p,i)=>
        <pointLight key={i} position={p as [number,number,number]} intensity={1} distance={6} color="#FF9900"/>
      )}
    </group>
  )
}

// ═══ TRADE ISLAND — Village market ═══
function TradeMarket() {
  const blocks = useMemo(() => {
    const b: { p:[number,number,number]; c:string }[] = []

    // Main stall pillars
    ;[[-3,-2],[3,-2],[-3,3],[3,3]].forEach(([x,z]) => {
      for (let y=1; y<=4; y++) b.push({p:[x,y,z], c:MC.log})
    })

    // Striped awning
    for (let x=-4; x<=4; x++) for (let z=-3; z<=4; z++)
      b.push({p:[x,5,z], c:(x+z)%2===0 ? MC.woolRed : MC.woolWhite})

    // Counter
    for (let x=-2; x<=2; x++) { b.push({p:[x,1,1], c:MC.planks}); b.push({p:[x,2,1], c:MC.planks}) }
    // Shelves
    for (let x=-2; x<=2; x++) for (let y=1; y<=3; y++) b.push({p:[x,y,-1], c:MC.planks})

    // Goods
    b.push({p:[-1,3,1], c:MC.gold}); b.push({p:[1,3,1], c:'#4a7a4a'})
    b.push({p:[-2,4,-1], c:MC.gold}); b.push({p:[0,4,-1], c:'#4a7a4a'}); b.push({p:[2,4,-1], c:MC.iron})

    // Well nearby
    for (let a=0; a<8; a++) {
      const angle = (a/8)*Math.PI*2
      b.push({p:[Math.round(Math.cos(angle)*2)+5, 1, Math.round(Math.sin(angle)*2)-3], c:MC.cobble})
      b.push({p:[Math.round(Math.cos(angle)*2)+5, 2, Math.round(Math.sin(angle)*2)-3], c:MC.cobble})
    }
    b.push({p:[5,0,-3], c:MC.water})
    b.push({p:[5,3,-5], c:MC.log}); b.push({p:[5,3,-1], c:MC.log})
    b.push({p:[5,4,-5], c:MC.planks}); b.push({p:[5,4,-4], c:MC.planks})
    b.push({p:[5,4,-3], c:MC.planks}); b.push({p:[5,4,-2], c:MC.planks}); b.push({p:[5,4,-1], c:MC.planks})

    // Lanterns
    b.push({p:[-3,6,0], c:MC.glowstone}); b.push({p:[3,6,0], c:MC.glowstone})

    // Hay bales
    b.push({p:[-5,1,2], c:'#c8a83e'}); b.push({p:[-5,1,3], c:'#c8a83e'}); b.push({p:[-5,2,2], c:'#c8a83e'})

    // Flower pots
    b.push({p:[-5,1,-2], c:MC.brick}); b.push({p:[-5,2,-2], c:'#e04040'})
    b.push({p:[5,1,3], c:MC.brick}); b.push({p:[5,2,3], c:'#e0e040'})

    return b
  }, [])

  return (
    <group>
      <IslandBase radius={7}/>
      {blocks.map((b,i)=><B key={i} p={b.p} c={b.c}/>)}
      <OakTree pos={[-6,0,-4]}/><OakTree pos={[6,0,4]}/><OakTree pos={[-4,0,5]}/>

      {/* Villager */}
      <group position={[0,1,0]}>
        <mesh position={[-0.15,0.4,0]} castShadow><boxGeometry args={[0.25,0.75,0.25]}/><meshStandardMaterial color="#553311" roughness={1}/></mesh>
        <mesh position={[0.15,0.4,0]} castShadow><boxGeometry args={[0.25,0.75,0.25]}/><meshStandardMaterial color="#553311" roughness={1}/></mesh>
        <mesh position={[0,1.1,0]} castShadow><boxGeometry args={[0.5,0.75,0.3]}/><meshStandardMaterial color="#664422" roughness={1}/></mesh>
        <mesh position={[-0.4,1.0,0.1]} rotation={[0.4,0,0]} castShadow><boxGeometry args={[0.25,0.6,0.25]}/><meshStandardMaterial color="#664422" roughness={1}/></mesh>
        <mesh position={[0.4,1.0,0.1]} rotation={[0.4,0,0]} castShadow><boxGeometry args={[0.25,0.6,0.25]}/><meshStandardMaterial color="#664422" roughness={1}/></mesh>
        <mesh position={[0,1.75,0]} castShadow><boxGeometry args={[0.5,0.5,0.5]}/><meshStandardMaterial color="#c29d70" roughness={1}/></mesh>
        <mesh position={[0,1.7,0.32]} castShadow><boxGeometry args={[0.15,0.25,0.15]}/><meshStandardMaterial color="#b38a5c" roughness={1}/></mesh>
        <mesh position={[-0.12,1.82,0.26]}><boxGeometry args={[0.08,0.06,0.01]}/><meshStandardMaterial color="#222" roughness={1}/></mesh>
        <mesh position={[0.12,1.82,0.26]}><boxGeometry args={[0.08,0.06,0.01]}/><meshStandardMaterial color="#222" roughness={1}/></mesh>
      </group>

      <pointLight position={[-3,7,0]} intensity={1.5} distance={6} color="#FFD080"/>
      <pointLight position={[3,7,0]} intensity={1.5} distance={6} color="#FFD080"/>
    </group>
  )
}

// ═══ LABELS ═══
function MCLabel({ text, position }: { text:string; position:[number,number,number] }) {
  return <Text position={position} fontSize={0.8} color="#FFF" outlineWidth={0.06} outlineColor="#000" anchorX="center" anchorY="middle" fontWeight="bold">{text}</Text>
}

// ═══ ANIMATED WRAPPER ═══
function AnimatedIsland({ children, position, onClick, label }: any) {
  const ref = useRef<THREE.Group>(null)
  const hover = useRef(false)
  const scl = useRef(S)
  useFrame((_,d) => {
    if (!ref.current) return
    scl.current = THREE.MathUtils.lerp(scl.current, hover.current ? S*1.06 : S, 8*d)
    ref.current.scale.setScalar(scl.current)
  })
  return (
    <group ref={ref} position={position} scale={S}
      onClick={e=>{e.stopPropagation();onClick()}}
      onPointerOver={e=>{e.stopPropagation();hover.current=true;document.body.style.cursor='pointer'}}
      onPointerOut={()=>{hover.current=false;document.body.style.cursor='default'}}>
      {children}
      <MCLabel text={label} position={[0,12,0]}/>
    </group>
  )
}

// ═══ TORCH FLAME ═══
function Flame({ position:p }: { position:[number,number,number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (ref.current) {
      const s = 0.12+Math.sin(Date.now()*0.02)*0.04
      ref.current.scale.set(s,s+Math.random()*0.08,s)
      ref.current.position.y = p[1]+0.5+Math.random()*0.04
    }
  })
  return <mesh ref={ref} position={p}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#FF9900" transparent opacity={0.85}/></mesh>
}

// ═══ LEAF PARTICLES ═══
function Leaves({ center:c }: { center:[number,number,number] }) {
  const pts = useMemo(() => {
    return Array.from({length:10}).map((_, i) => {
      // Deterministic coordinates so they never jump/flicker on re-render
      const seedX = Math.sin(c[0] * 12.9898 + c[2] * 78.233 + i) * 43758.5453
      const seedY = Math.cos(c[1] * 37.719 + i) * 143758.5453
      const seedZ = Math.sin(c[0] * 93.189 + c[2] * 47.971 + i) * 243758.5453
      
      const rx = (Math.abs(seedX) % 1) - 0.5
      const ry = Math.abs(seedY) % 1
      const rz = (Math.abs(seedZ) % 1) - 0.5
      const rs = Math.abs(seedX + seedY) % 1
      const rd = ((Math.abs(seedZ + seedY) % 1) - 0.5) * 0.015
      const rph = (Math.abs(seedX + seedZ) % 1) * Math.PI * 2
      
      return {
        x: c[0] + rx * 10,
        y: c[1] + 5 + ry * 4,
        z: c[2] + rz * 10,
        s: 0.004 + rs * 0.008,
        d: rd,
        ph: rph
      }
    })
  }, [c[0], c[1], c[2]])
  const refs = useRef<(THREE.Mesh|null)[]>([])
  useFrame(() => {
    refs.current.forEach((m,i)=>{
      if(!m) return; const p=pts[i]; p.y-=p.s; p.x+=Math.sin(Date.now()*0.001+p.ph)*p.d
      if(p.y<c[1]) p.y=c[1]+7+Math.random()*2; m.position.set(p.x,p.y,p.z); m.rotation.y+=0.02
    })
  })
  return <>{pts.map((_,i)=><mesh key={i} ref={el=>{refs.current[i]=el}}><boxGeometry args={[0.12,0.04,0.12]}/><meshBasicMaterial color="#2d6e12" transparent opacity={0.6}/></mesh>)}</>
}

// ═══ EMPIRE ISLAND — Nether fortress style ═══
function EmpireFortress() {
  const blocks = useMemo(() => {
    const b: { p:[number,number,number]; c:string }[] = []

    // Dark obsidian + netherrack base tower
    for (let x=-2; x<=2; x++) for (let z=-2; z<=2; z++) {
      const isWall = x===-2||x===2||z===-2||z===2
      if (isWall) {
        for (let y=1; y<=6; y++) b.push({p:[x,y,z], c: y%2===0 ? MC.obsidian : '#6b3333'})
        // Spikes on top
        if ((x+z)%2===0) b.push({p:[x,7,z], c:MC.obsidian})
      } else {
        b.push({p:[x,1,z], c:'#6b3333'}) // Floor
      }
    }

    // Central beacon
    b.push({p:[0,2,0], c:MC.obsidian}); b.push({p:[0,3,0], c:MC.glowstone})
    b.push({p:[0,4,0], c:MC.gold}); b.push({p:[0,5,0], c:MC.glowstone})

    // Lava pool around
    for (let x=-3; x<=3; x++) for (let z=-3; z<=3; z++) {
      const dist = Math.max(Math.abs(x),Math.abs(z))
      if (dist===3) b.push({p:[x,0,z], c:'#cf5a1a'})
    }

    // Corner pillars with fire
    ;[[-3,-3],[3,-3],[-3,3],[3,3]].forEach(([cx,cz]) => {
      for (let y=1; y<=8; y++) b.push({p:[cx,y,cz], c:MC.obsidian})
      b.push({p:[cx,9,cz], c:MC.glowstone})
    })

    // Entrance
    b.push({p:[-1,3,2], c:MC.obsidian}); b.push({p:[1,3,2], c:MC.obsidian})
    b.push({p:[-1,4,2], c:MC.obsidian}); b.push({p:[0,4,2], c:MC.obsidian}); b.push({p:[1,4,2], c:MC.obsidian})

    // Banner poles
    b.push({p:[-1,5,2], c:MC.obsidian}); b.push({p:[-1,6,2], c:MC.gold})
    b.push({p:[1,5,2], c:MC.obsidian}); b.push({p:[1,6,2], c:MC.gold})

    // Path
    for (let z=3; z<=5; z++) { b.push({p:[0,1,z], c:'#6b3333'}); b.push({p:[-1,1,z], c:'#6b3333'}); b.push({p:[1,1,z], c:'#6b3333'}) }

    return b
  }, [])

  return (
    <group>
      <IslandBase radius={6}/>
      {blocks.map((b,i)=><B key={i} p={b.p} c={b.c}/>)}
      {/* Lava glow */}
      <pointLight position={[0,1,0]} intensity={2} distance={8} color="#FF4400"/>
      {/* Corner glowstone */}
      {[[-3,10,-3],[3,10,-3],[-3,10,3],[3,10,3]].map((p,i)=>
        <pointLight key={i} position={p as [number,number,number]} intensity={1} distance={5} color="#FFD080"/>
      )}
    </group>
  )
}

// ═══ MAIN EXPORT ═══
export default function Islands({ onChestClick, onAuctionClick, onTradeClick, onEmpireClick, chestOpen }: any) {
  return (
    <group>
      <AnimatedIsland position={[-10,0,10]} onClick={onChestClick} label="Chest">
        <ChestIsland isOpen={chestOpen} onClick={onChestClick}/>
        <Leaves center={[-4,0,-3]}/><Flame position={[-3,3,3]}/><Flame position={[3,3,3]}/>
      </AnimatedIsland>
      <AnimatedIsland position={[12,0,10]} onClick={onAuctionClick} label="Auction">
        <AuctionCastle/>
        <Flame position={[-4,10,-4]}/><Flame position={[4,10,-4]}/><Flame position={[-4,10,4]}/><Flame position={[4,10,4]}/>
      </AnimatedIsland>
      <AnimatedIsland position={[10,0,-7]} onClick={onTradeClick} label="Trade">
        <TradeMarket/>
      </AnimatedIsland>
      <AnimatedIsland position={[-10,0,-7]} onClick={onEmpireClick} label="My Cities">
        <EmpireFortress/>
        <Flame position={[-3,9,-3]}/><Flame position={[3,9,-3]}/><Flame position={[-3,9,3]}/><Flame position={[3,9,3]}/>
      </AnimatedIsland>
    </group>
  )
}

