// Terrain biome classification for each Indian state/UT

export type TerrainType =
  | 'snow_mountain'   // Himalayas – J&K, HP, UT, SK, Ladakh
  | 'green_mountain'  // Northeast hills – AR, MN, ML, MZ, NL, TR, AS
  | 'desert'          // Arid/Semi-arid – RJ, GJ
  | 'coastal'         // Tropical coast – KL, GA, LD, AN, PY, DN, DD
  | 'plains'          // Indo-Gangetic – PB, HR, UP, BR, WB
  | 'plateau'         // Deccan – MH, KA, AP, TG, TN
  | 'forest'          // Tribal forest belt – CT, JH, OR
  | 'metro'           // Dense urban – DL, CH

export interface TerrainInfo {
  label:       string
  icon:        string
  topColor:    string   // THREE.Color hex for voxel top face
  sideColor:   string   // darker side face
  heightBase:  number   // base extrude depth in standard mode
  decoration:  'snow' | 'cactus' | 'palm' | 'tree' | 'city' | 'peak' | null
}

export const STATE_TERRAIN: Record<string, TerrainType> = {
  // ── Himalayan snow mountains ─────────────────────────────────
  JK: 'snow_mountain',
  LA: 'snow_mountain',
  HP: 'snow_mountain',
  UT: 'snow_mountain',
  SK: 'snow_mountain',

  // ── Northeast green highlands ────────────────────────────────
  AR: 'green_mountain',
  MN: 'green_mountain',
  ML: 'green_mountain',
  MZ: 'green_mountain',
  NL: 'green_mountain',
  TR: 'green_mountain',
  AS: 'green_mountain',

  // ── Desert & Arid ────────────────────────────────────────────
  RJ: 'desert',
  GJ: 'desert',

  // ── Coastal Tropical ─────────────────────────────────────────
  KL: 'coastal',
  GA: 'coastal',
  LD: 'coastal',
  AN: 'coastal',
  PY: 'coastal',
  DN: 'coastal',
  DD: 'coastal',

  // ── Indo-Gangetic Plains ─────────────────────────────────────
  PB: 'plains',
  HR: 'plains',
  UP: 'plains',
  BR: 'plains',
  WB: 'plains',
  MP: 'plains',

  // ── Deccan Plateau ───────────────────────────────────────────
  MH: 'plateau',
  KA: 'plateau',
  AP: 'plateau',
  TG: 'plateau',
  TN: 'plateau',

  // ── Forest / Tribal Belt ─────────────────────────────────────
  CT: 'forest',
  JH: 'forest',
  OR: 'forest',

  // ── Metro Urban ──────────────────────────────────────────────
  DL: 'metro',
  CH: 'metro',
}

export const TERRAIN_INFO: Record<TerrainType, TerrainInfo> = {
  snow_mountain: {
    label: 'Himalayan Mountains',
    icon:  '🏔️',
    topColor:   '#c4d4de',
    sideColor:  '#8096a4',
    heightBase: 0.72,     // mountains are tallest
    decoration: 'snow',
  },
  green_mountain: {
    label: 'Hill & Rainforest',
    icon:  '⛰️',
    topColor:   '#5a8060',
    sideColor:  '#3a5540',
    heightBase: 0.60,
    decoration: 'peak',
  },
  desert: {
    label: 'Desert & Arid',
    icon:  '🏜️',
    topColor:   '#d4a96a',
    sideColor:  '#9a7040',
    heightBase: 0.34,     // flat desert
    decoration: 'cactus',
  },
  coastal: {
    label: 'Coastal Tropical',
    icon:  '🌴',
    topColor:   '#3d9970',
    sideColor:  '#2a6a50',
    heightBase: 0.36,     // low coastal plains
    decoration: 'palm',
  },
  plains: {
    label: 'Fertile Plains',
    icon:  '🌾',
    topColor:   '#6aaa50',
    sideColor:  '#4a7a38',
    heightBase: 0.42,
    decoration: null,
  },
  plateau: {
    label: 'Deccan Plateau',
    icon:  '🗻',
    topColor:   '#c47d4a',
    sideColor:  '#8a5030',
    heightBase: 0.52,     // elevated plateau
    decoration: null,
  },
  forest: {
    label: 'Dense Jungle',
    icon:  '🌲',
    topColor:   '#3d6e30',
    sideColor:  '#2a4a20',
    heightBase: 0.48,
    decoration: 'tree',
  },
  metro: {
    label: 'Metropolitan',
    icon:  '🏙️',
    topColor:   '#909498',
    sideColor:  '#606870',
    heightBase: 0.65,     // tall urban
    decoration: 'city',
  },
}
