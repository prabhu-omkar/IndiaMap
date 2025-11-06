import * as THREE from 'three'
import { useMemo } from 'react'

export const createBlockTexture = (hexColors: string[], pattern = 'noise') => {
  const size = 16
  const data = new Uint8Array(size * size * 4)
  const colors = hexColors.map(c => new THREE.Color(c))
  
  for (let i = 0; i < size * size; i++) {
    const x = i % size
    const y = size - 1 - Math.floor(i / size)
    let c = colors[Math.floor(Math.random() * colors.length)]
    
    if (pattern === 'planks') {
      if (y === 0 || y === 4 || y === 8 || y === 12) c = new THREE.Color('#785a30')
      else if (x === 0 || x === 15) c = new THREE.Color('#947141')
    } else if (pattern === 'cobble') {
      if (Math.random() > 0.7) c = new THREE.Color('#3b3b3b')
    } else if (pattern === 'log_side') {
      c = colors[x % colors.length]
      if (Math.random() > 0.8) c = colors[Math.floor(Math.random() * colors.length)]
    } else if (pattern === 'grass_side') {
      const grassColors = [new THREE.Color('#598c37'), new THREE.Color('#6b9e40')]
      const dirtColors = [new THREE.Color('#866043'), new THREE.Color('#714a30')]
      if (y < 6) c = grassColors[Math.floor(Math.random() * grassColors.length)]
      else if (y === 6 && Math.random() > 0.5) c = grassColors[Math.floor(Math.random() * grassColors.length)]
      else c = dirtColors[Math.floor(Math.random() * dirtColors.length)]
    } else if (pattern === 'leaves') {
      if (Math.random() > 0.7) c = new THREE.Color('#244517') 
    }
    
    data[i * 4] = c.r * 255
    data[i * 4 + 1] = c.g * 255
    data[i * 4 + 2] = c.b * 255
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function useMinecraftMaterials() {
  return useMemo(() => {
    const TEX = {
      dirt: createBlockTexture(['#866043', '#714a30']),
      grass_top: createBlockTexture(['#598c37', '#6b9e40']),
      grass_side: createBlockTexture(['#598c37', '#866043'], 'grass_side'),
      stone: createBlockTexture(['#7d7d7d', '#6e6e6e']),
      cobble: createBlockTexture(['#636363', '#525252', '#424242'], 'cobble'),
      planks: createBlockTexture(['#b38f56', '#9e7d4a'], 'planks'),
      log_top: createBlockTexture(['#9c7f4b', '#80673d']),
      log_side: createBlockTexture(['#5c4528', '#45331d'], 'log_side'),
      leaves: createBlockTexture(['#315e1f', '#3c7526'], 'leaves'),
      wool_red: createBlockTexture(['#a12722', '#8c221e']),
      wool_white: createBlockTexture(['#e9ecec', '#d2d6d6']),
    }

    const basicParams = { roughness: 1, metalness: 0 }
    const MATS: Record<string, any> = {
      dirt: new THREE.MeshStandardMaterial({ map: TEX.dirt, ...basicParams }),
      stone: new THREE.MeshStandardMaterial({ map: TEX.stone, ...basicParams }),
      cobble: new THREE.MeshStandardMaterial({ map: TEX.cobble, ...basicParams }),
      planks: new THREE.MeshStandardMaterial({ map: TEX.planks, ...basicParams }),
      leaves: new THREE.MeshStandardMaterial({ map: TEX.leaves, ...basicParams }),
      wool_red: new THREE.MeshStandardMaterial({ map: TEX.wool_red, ...basicParams }),
      wool_white: new THREE.MeshStandardMaterial({ map: TEX.wool_white, ...basicParams }),
    }

    MATS.grass = [
      new THREE.MeshStandardMaterial({ map: TEX.grass_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.grass_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.grass_top, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.dirt, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.grass_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.grass_side, ...basicParams }),
    ]

    MATS.log = [
      new THREE.MeshStandardMaterial({ map: TEX.log_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.log_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.log_top, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.log_top, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.log_side, ...basicParams }),
      new THREE.MeshStandardMaterial({ map: TEX.log_side, ...basicParams }),
    ]

    return MATS
  }, [])
}
