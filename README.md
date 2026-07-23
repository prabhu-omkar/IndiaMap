# 🗺️ IndiaMap

An interactive 3D map of India built with React and Three.js — explore every state and union territory through animated data visualizations covering GDP, population, literacy, and per capita income.

**Live Demo →** [prabhu-omkar.github.io/IndiaMap](https://prabhu-omkar.github.io/IndiaMap/)

---

## Preview

| Normal Mode | GDP Heatmap | State Detail |
|:-----------:|:-----------:|:------------:|
| Terrain-colored 3D voxels | Color + height encode GDP | Donut rings, gauges & rankings |

---

## Features

### 🌍 Interactive 3D Map
- All **36 states and union territories** of India rendered as 3D extruded voxels
- **Click any state** (in Normal mode) to open a detailed stats panel
- **Orbit, pan, and zoom** with mouse or touch gestures
- Smooth animated camera fly-to on state selection

### 🎨 Five View Modes
| Mode | What it shows |
|------|---------------|
| **Normal** | Terrain-based colors (plains, desert, coastal, himalayan, forest, etc.) |
| **GDP** | Height + color encode total state GDP |
| **Population** | Height + color encode population size |
| **Per Capita** | Wealth gradient from ₹50k to ₹6L+ |
| **Literacy** | Purple gradient from low to high literacy rate |

Switching modes triggers a **smooth per-frame animation** — all states simultaneously rise/fall and recolor.

### 📊 State Detail Panel
Clicking a state reveals a rich data panel:
- **National rank badges** for GDP, population, literacy and per-capita income
- **4-dimension radar chart** vs the national average
- **Animated donut rings** for literacy rate, GDP rank, and population share
- **GDP share bar** showing the state's slice of India's ₹248L Cr economy
- **Comparative population bar** with national average marker
- **Half-arc per capita gauge** with needle animation
- **Density and area** quick-stat tiles
- **Terrain type badge** (e.g. Himalayan, Coastal, Desert)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| 3D Engine | Three.js via `@react-three/fiber` |
| 3D Helpers | `@react-three/drei` (OrbitControls, etc.) |
| Map Projection | `d3-geo` (Mercator) |
| GeoJSON | Custom `modern_india.geojson` with state boundaries |
| Build Tool | Vite 8 |
| Deployment | GitHub Pages via GitHub Actions |

---

## Architecture

```
client/
├── public/
│   └── modern_india.geojson      # India state boundaries
├── src/
│   ├── App.tsx                   # Root: mode state, layout
│   ├── components/
│   │   ├── IndiaMap.tsx          # 3D state voxels + per-frame animations
│   │   ├── CameraController.tsx  # OrbitControls + programmatic fly-to
│   │   ├── MapControls.tsx       # Mode switcher pills + legend
│   │   └── StatePanel.tsx        # Slide-in stats panel
│   └── data/
│       ├── indiaData.ts          # GDP, population, literacy, area per state
│       └── terrainData.ts        # Terrain type + biome colors per state
```

### Animation System
Geometry is built **once per state** (not rebuilt on mode changes). In every `useFrame`:
- `group.scale.y` lerps to the target height for the current mode
- `group.position.y` adjusts to keep the base flush with the ocean floor
- `material.color` lerps to the target heatmap color

This gives smooth simultaneous height + color transitions at 60fps with zero geometry allocation.

---

## Running Locally

```bash
# Clone
git clone https://github.com/prabhu-omkar/IndiaMap.git
cd IndiaMap/client

# Install
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

Deployed automatically to GitHub Pages via GitHub Actions on every push to `main`.

The workflow (`.github/workflows/deploy.yml`):
1. Installs dependencies inside `client/`
2. Runs `npm run build` (Vite + TypeScript)
3. Uploads `client/dist/` as a Pages artifact
4. Deploys to `https://prabhu-omkar.github.io/IndiaMap/`

---

## Data Sources

All state-level statistics are compiled from publicly available Indian government data:

- **GDP** — Ministry of Statistics (MOSPI), 2022–23 estimates (₹ Crore)
- **Population** — Census 2011 projections (millions)
- **Per Capita Income** — State NSDPs, 2022–23
- **Literacy Rate** — Census 2011
- **Area** — Survey of India
- **GeoJSON boundaries** — Simplified for web rendering

---

## License

MIT — feel free to fork, adapt, and build on it.
