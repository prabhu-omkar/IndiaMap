# PolyCraft: Comprehensive Technical Architecture and Implementation Report

## 1. Introduction and Game Overview
**PolyCraft** is a sophisticated, browser-based 3D economic strategy and simulation game. Set against a highly detailed, interactive 3D map of a modern India, players compete to build financial empires by acquiring, managing, and trading cities. The game features a vibrant, voxel-inspired aesthetic (often referred to as low-poly or blocky styling) paired with a deep, player-driven economy.

PolyCraft leverages modern web technologies to deliver a seamless, high-framerate experience. It combines a reactive frontend with a real-time, event-driven backend, enabling competitive mechanics such as live auctions, player-to-player trading, and dynamic yield generation (GDP). This report provides an exhaustive breakdown of the application's architecture, 3D rendering pipeline, database design, and real-time networking capabilities.

---

## 2. High-Level System Architecture
The application is built on a robust, full-stack JavaScript/TypeScript ecosystem, divided into discrete, specialized layers:

### 2.1 The Tech Stack
*   **Frontend Client:** React 18, Vite (for ultra-fast HMR and bundling), React Three Fiber (R3F) for declarative 3D rendering, Drei for specialized 3D helpers, and Zustand for global state management.
*   **Backend Server:** Node.js environment utilizing Express.js for the REST API and routing.
*   **Real-Time Engine:** Socket.io for bidirectional, event-based communication.
*   **Database Layer:** PostgreSQL managed via Prisma ORM for type-safe database interactions and migrations.
*   **Authentication:** Custom JSON Web Token (JWT) implementation with bcrypt password hashing.

### 2.2 Architectural Flow
When a user accesses PolyCraft, the React frontend initializes a WebGL context via `Canvas`. The client authenticates against the Express backend, retrieving a JWT stored securely in HTTP-only cookies or local storage. Once authenticated, a persistent WebSocket connection is established. The client fetches static configuration data (like the GeoJSON map) and dynamic game state (city ownership, active auctions) via REST, while subsequent micro-interactions (bids, trades) are broadcasted globally via WebSockets, ensuring all clients maintain a synchronized world state.

---

## 3. Database Schema and Relational Modeling
The backbone of PolyCraft's economy is its relational database. Designed in PostgreSQL using Prisma, the schema is highly normalized to enforce data integrity and prevent race conditions during concurrent transactions.

### 3.1 Core Data Models
1.  **User Model:** 
    *   Tracks `id`, `username`, `email`, and `passwordHash`.
    *   Maintains the player's liquid capital in `walletBalance`.
    *   Stores aesthetic preferences like `color`.
    *   Maintains strict foreign key relationships with `City` (one-to-many), `Transaction` (one-to-many), and `Auction`/`Trade` models.
2.  **State Model:**
    *   Represents the 31 modern Indian States and Union Territories (e.g., Telangana, Ladakh).
    *   Stores macroeconomic aggregations: `totalGdp`, `capital`, `population`, and `totalCities`.
    *   Acts as a structural parent for cities.
3.  **City Model:**
    *   The fundamental tradable asset in PolyCraft.
    *   Fields include `name`, `code`, `gdp`, `population`, and `basePrice`.
    *   The `ownerId` acts as a nullable foreign key pointing to the `User` model. If null, the city is unowned and available for direct purchase from the system.
    *   Contains a boolean flag `isForSale` and an optional `salePrice` for the marketplace system.
4.  **Transaction Model:**
    *   An immutable ledger recording every financial event.
    *   Fields include `type` (e.g., 'PURCHASE', 'SALE', 'INCOME', 'AUCTION_WIN'), `amount`, `cityId`, and timestamps.
    *   Critical for auditing, rollback scenarios, and calculating historical player net worth.
5.  **Auction and Trade Models:**
    *   **Auction:** Tracks `cityId`, `sellerId`, `highestBid`, `highestBidderId`, and `endTime`.
    *   **Trade:** Manages complex multi-asset exchanges, tracking `senderId`, `receiverId`, `offeredCityId`, `requestedCityId`, `offeredAmount`, and `status` ('PENDING', 'ACCEPTED', 'REJECTED').

### 3.2 Transactional Integrity
Given the competitive nature of the game, purchasing a city must be an atomic operation. The backend utilizes Prisma's interactive transactions (`prisma.$transaction`) to guarantee that deducting funds from a user's wallet, updating the city's `ownerId`, and logging the event in the `Transaction` table either completely succeed or completely fail, preventing double-spend vulnerabilities.

---

## 4. Backend Implementation and Real-Time Networking
### 4.1 REST API Design
The Express backend is organized into domain-specific routers:
*   `/api/auth`: Handles registration, login, and token issuance.
*   `/api/states` & `/api/cities`: Serves the geographical and economic data required to render the map and tooltips.
*   `/api/economy`: Manages direct purchases, marketplace listings, and the daily GDP distribution algorithms.

### 4.2 Real-Time Engine (Socket.io)
Polling the database for active auctions or trades would overwhelm the server. Instead, PolyCraft uses WebSockets to push state mutations to clients in real-time.
*   **Event Broadcasting:** When Player A places a bid on a city, the REST endpoint validates the bid, updates the database, and emits an `auction_updated` event via Socket.io.
*   **Client Synchronization:** All connected clients listen for this event. Upon receiving it, their local Zustand state is updated, instantly reflecting the new highest bid on their UI without a page refresh or subsequent HTTP request.
*   **Chron Jobs:** The server utilizes scheduled tasks (e.g., `node-cron`) to process daily events, such as distributing GDP revenue to city owners. Once processed, a massive `income_distributed` WebSocket event alerts online players of their new wallet balances.

---

## 5. 3D Rendering Engine (React Three Fiber)
The visual centerpiece of PolyCraft is its fully interactive, 3D extruded map of India, rendered using WebGL via React Three Fiber.

### 5.1 GeoJSON Parsing and Map Projection
PolyCraft utilizes a modern, highly detailed GeoJSON dataset that accurately reflects current geopolitical boundaries (including the separation of Ladakh from Jammu & Kashmir, and the statehood of Telangana).
1.  **Coordinate Translation:** The raw GeoJSON provides coordinates in standard WGS84 format (longitude and latitude). R3F utilizes `d3-geo`'s `geoMercator` projection to translate these spherical coordinates into a flat 2D Cartesian plane (`x` and `y`).
2.  **Shape Generation:** Custom utility functions parse the translated coordinates, generating `THREE.Shape` objects. The algorithm specifically accounts for complex geometries like `MultiPolygon` structures, ensuring that internal holes (lakes or enclaves) and disjointed landmasses (islands) are properly mapped using `THREE.Path`.

### 5.2 3D Extrusion and Voxel Aesthetics
Once 2D shapes are generated, they are fed into `THREE.ExtrudeGeometry`.
*   **Blocky Styling:** To achieve the voxel/Minecraft aesthetic, the `ExtrudeGeometry` is configured with `curveSegments: 1` and `bevelEnabled: false`. This intentionally strips away smooth curvature, forcing the geometry into sharp, blocky polygons.
*   **Material Mapping:** The application uses an array of materials applied to the geometry. The "top" face receives a dynamic, status-based color (e.g., Grass Green for unowned, Gold for on-sale, Dark Green for owned), while the "side" faces receive a static dirt-brown color, perfectly mimicking a block of earth pulled from the ground.

### 5.3 Advanced Mesh Grouping Optimization
A major optimization in the rendering pipeline is the strategic grouping of meshes.
*   *The Problem:* Standard GeoJSON parsers create a separate 3D mesh for every single polygon. For states with hundreds of islands (like the Andaman & Nicobar Islands) or fragmented territories, this means hundreds of independent DOM/WebGL nodes. Hovering over one island would only highlight that specific island.
*   *The Solution:* The rendering loop aggregates all generated `THREE.Shape` objects by their respective state identifier (`properties.ID`). All shapes belonging to a single state are passed into a single `THREE.ExtrudeGeometry` instance. 
*   *The Result:* This creates a unified `StateMesh`. When a user's raycaster intersects any part of the state (even a remote island), the entire state acts as a single interactive unit—it highlights uniformly and lerps upward along the Y-axis as one solid piece, vastly improving the UX.

---

## 6. Deterministic Environmental Rendering
PolyCraft populates its world with decorative 3D elements like voxel trees, floating islands, dynamic torches, and falling leaf particles. Managing these within a reactive framework presented significant technical hurdles.

### 6.1 The "Bouncing Asset" Dilemma
In React, whenever state changes (such as a user hovering over the map, which triggers a tooltip state update), the component tree re-renders. 
Initially, environmental assets like trees used `Math.random()` to determine their height, and particles used `Math.random()` for their spawn coordinates. Furthermore, props like `position={[-4, 0, -3]}` passed literal arrays. Because literal arrays have a different memory reference on every render, React's `useMemo` hooks constantly evaluated as "changed," causing the components to recalculate. This resulted in trees spontaneously changing height and particles jumping across the screen every time the user moved their mouse.

### 6.2 Spatial Hashing and Primitive Dependencies
To achieve perfectly stable, deterministic rendering without sacrificing procedural generation:
1.  **Dependency Flattening:** Instead of passing arrays to `useMemo` dependencies (e.g., `[position]`), the dependencies were flattened to primitives (`[position[0], position[1], position[2]]`). Because primitive numbers match by value, not reference, the hook avoids unnecessary recalculations.
2.  **Deterministic Hash Functions:** `Math.random()` was entirely purged from the render cycle. Instead, a custom pseudo-random spatial hashing algorithm was implemented:
    ```javascript
    const hash = Math.abs(Math.sin(pos[0] * 12.9898 + pos[2] * 78.233) * 43758.5453) % 1;
    ```
    By using the X and Z coordinates of the object as the seed, the hash output is completely pseudo-random but 100% deterministic. A tree at coordinate `[-4, -3]` will *always* generate the exact same height, completely eliminating visual artifacts, bouncing, or flickering during React re-renders.

---

## 7. Advanced Camera Control System
Navigating a sprawling 3D map requires a sophisticated camera system. PolyCraft utilizes a custom-built camera controller that wraps around Drei's `CameraControls`.

### 7.1 Interaction-Aware Interrupt Logic
A common flaw in 3D web applications is "camera fighting"—where automated cinematic movements conflict with manual user inputs.
*   The PolyCraft controller actively listens to the `control.active` state.
*   If a programmatic transition (e.g., the camera flying to focus on the "Daily Chest" island) is underway, but the user clicks and drags the map, the system instantly detects the manual interaction.
*   The system immediately aborts the mathematical lerp, seamlessly handing control back to the player without jarring snaps or locked controls.

### 7.2 Mathematical Clamping and Damping
To ensure transitions feel premium regardless of the user's hardware frame rate:
*   The camera target and position are updated inside a `useFrame` loop utilizing `THREE.MathUtils.lerp`.
*   A maximum speed clamp is applied to the delta step, preventing the camera from snapping too quickly if the browser experiences a lag spike.
*   When a user closes an overlay panel, the camera target resets to `null`, triggering a smooth, damped return to a hardcoded "overview" perspective, framing the entire subcontinent perfectly.

---

## 8. User Interface and Aesthetics
PolyCraft bridges the gap between complex economic data and accessible gaming interfaces through careful UI design.

### 8.1 Glassmorphism and Theming
The HUD (Heads Up Display) and modular panels (Marketplace, Empire Dashboard, Auctions) utilize glassmorphism. By employing CSS `backdrop-filter: blur(10px)` with semi-transparent dark backgrounds (`rgba(20, 20, 20, 0.8)`), the UI elements remain highly legible while allowing the 3D map to remain visible underneath, maintaining player immersion.

### 8.2 Typography and Tooltips
*   **Fonts:** The game uses the Google Font `VT323` for headers and stylized elements, enforcing the voxel/retro aesthetic. Data-dense areas use standard sans-serif fonts (`Inter` or `System-UI`) for optimal readability.
*   **Dynamic Tooltips:** When the raycaster intersects a state, a custom tooltip component tracks the `clientX` and `clientY` mouse coordinates. This tooltip displays critical real-time data retrieved from the Zustand store, including the state's total GDP, the number of cities owned by the player versus the total available, and the current state name.

---

## 9. Conclusion
PolyCraft stands as a prime example of leveraging modern web technologies to create rich, stateful, 3D applications in the browser. By combining the declarative power of React Three Fiber with highly optimized, deterministic rendering algorithms and real-time WebSocket communication, the platform achieves a rare balance of complex economic simulation and fluid, visually striking gameplay. The architectural decisions made—from the normalized PostgreSQL schema to the primitive-based dependency optimization in the frontend—ensure that PolyCraft is secure, scalable, and highly performant.
