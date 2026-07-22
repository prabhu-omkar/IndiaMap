# IndiaMap 🌍

An interactive **3D data visualisation** of India's states and union territories — built with React, Three.js and Vite.

Click any state on the 3D voxel map to explore a rich data panel with animated charts, national rankings, and comparative visuals.

---

## Features

- **3D voxel map** of all 36 Indian states & UTs (React Three Fiber + Three.js)
- **Terrain biome colours** — Himalayan snow, desert sand, coastal teal, Deccan plateau rust, fertile plains green, dense forest
- **5 visualisation modes** with height + colour encoding:
  - 🌍 Terrain (natural geography, per-capita height)
  - 📊 GDP
  - 👥 Population
  - 💰 Per Capita Income
  - 📚 Literacy Rate
- **State detail panel** with:
  - National rank badges (🥇🥈🥉 medals for top 3)
  - Animated SVG radar chart vs national average
  - Animated donut rings, half-arc gauge, comparative bars
  - GDP share of India visualisation
  - Population density & area tiles
- **Animated amber pulse rings** on selected state
- **Hover tooltip** with key stats
- **Mobile responsive** — bottom sheet panel on small screens
- Fully **serverless** — no backend or database required

---

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| 3D | @react-three/fiber · three.js |
| Build | Vite |
| Styling | Vanilla CSS (no Tailwind) |
| Fonts | Inter · Space Grotesk (Google Fonts) |
| Data | Static JSON (indiaData.ts) |

---

## Getting Started

```bash
git clone https://github.com/prabhu-omkar/IndiaMap.git
cd IndiaMap/client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Data

State statistics are stored in [`client/src/data/indiaData.ts`](client/src/data/indiaData.ts) and include:

- GDP, Per Capita Income, Population, Literacy Rate, Area
- Cities (name, population, GDP)
- Industries

Terrain biome classification lives in [`client/src/data/terrainData.ts`](client/src/data/terrainData.ts).

---

## License

MIT
