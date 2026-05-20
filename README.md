# PolyCraft 🏙️

PolyCraft is a sophisticated, browser-based 3D economic strategy and simulation game. Set against a highly detailed, interactive 3D map of modern India, players compete to build financial empires by acquiring, managing, and trading cities. The game features a vibrant, voxel-inspired aesthetic paired with a deep, player-driven economy.

## 🌟 Features
- **Interactive 3D Voxel Map**: Explore a beautiful, blocky (Minecraft-inspired) 3D map of modern India (including Telangana and Ladakh) built with React Three Fiber.
- **Dynamic Player Economy**: Buy unowned cities, generate daily GDP, and watch your net worth grow.
- **Real-Time Multiplayer Trading & Auctions**: Trade cities with other players or initiate live bidding wars using real-time WebSockets.
- **Daily Rewards Hub**: Visit the Daily Chest island to claim random rewards and boost your empire's growth.
- **Smart Camera System**: Smooth, interaction-aware camera lerping and transitions.
- **Deterministic Rendering**: Zero-flicker procedural asset generation utilizing custom spatial hashing.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, React Three Fiber, Drei, Zustand, HTML5 Canvas
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-Time**: Socket.io
- **Authentication**: Custom JWT with bcrypt hashing

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/prabhu-omkar/polycraft.git
   cd polycraft
   ```

2. Setup the Backend:
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory and add your Postgres connection string and JWT secret:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/polycraft?schema=public"
   JWT_SECRET="your_super_secret_key"
   ```
   Run database migrations and seed the initial data:
   ```bash
   npm run prisma:push
   npm run seed
   ```

3. Setup the Frontend:
   ```bash
   cd ../client
   npm install
   ```

### Running the Game
You will need two terminal windows to run both the client and server.

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the frontend client:
   ```bash
   cd client
   npm run dev
   ```
The game will be available at `http://localhost:5174/` (or whichever port Vite provides).

## 🎮 Demo Users
The database seed script automatically creates three demo users you can use to test the game:
- **Username**: `emperor1`, `emperor2`, `emperor3`
- **Password**: `password123` (for all demo accounts)

---
*Built with ❤️ utilizing WebGL, React, and PostgreSQL.*
