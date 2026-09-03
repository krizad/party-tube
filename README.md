# 🎉 PartyTube - Turborepo Monorepo

> **Collaborative Real-time YouTube Music & Karaoke Queue for Parties**

PartyTube allows party hosts to project an interactive YouTube video player and live queue on a big screen (TV or laptop), while guests join instantly via QR code on their mobile phones to search, queue songs, and vote/manage the party playlist in real time.

---

## 🏗 Monorepo Architecture

PartyTube is built as a high-performance **Turborepo** monorepo using **pnpm**:

```
PartyTube/
├── apps/
│   ├── backend/             # NestJS API + Socket.io WebSocket Gateway + Prisma ORM
│   └── frontend/            # Next.js 15 (App Router) + Tailwind CSS + Lucide + Zustand + Sonner
├── packages/
│   ├── shared-types/        # Shared DTOs, Event contracts & Database models
│   ├── database/            # Prisma Schema, Migrations & SQLite/MySQL client
│   ├── tsconfig/            # Shared TypeScript configs (base, nextjs, nestjs)
│   └── eslint-config/       # Shared ESLint configuration
├── docker-compose.yml       # MySQL 8.0, Backend, Frontend & Adminer
├── turbo.json               # Turborepo task pipeline configuration
└── pnpm-workspace.yaml      # Monorepo workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker & Docker Compose (optional for MySQL)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
cp .env.example packages/database/.env
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local
```

### 3. Initialize Database
```bash
pnpm --filter @partytube/database db:push
```

### 4. Run Development Servers
```bash
pnpm dev
```
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Testing & Building

```bash
# Run all unit tests across the monorepo
pnpm test

# Build all packages and apps with Turborepo caching
pnpm build
```

---

## 🐳 Running with Docker Compose

```bash
docker-compose up --build
```
- **Web App**: `http://localhost:3000`
- **API Server**: `http://localhost:3001`
- **Adminer DB UI**: `http://localhost:8080` (MySQL server: `mysql`, User: `root`, Password: `partysecret`, Database: `partytube`)

---

## 🎯 Key Features

1. **Zero-Quota YouTube Search**:
   - Uses `youtube-sr` InnerTube scraper + regex URL parser for 100% quota-free searches.
   - Supports direct URL paste (`youtu.be`, `youtube.com/watch?v=`, `youtube.com/shorts/`) for instant queue addition.
   - In-memory LRU cache with TTL for ultra-fast response times.

2. **Host Big-Screen Experience**:
   - Automated continuous playback (auto-advances to next queued track on video end).
   - Prominent 6-character room code & QR code display for guests to scan.
   - Host controls: Play/Pause, Skip Track, Volume slider, Fullscreen mode, and Queue reordering.

3. **Guest Mobile Experience**:
   - Instant join via QR code scan or room URL (no passwords required, just enter a nickname).
   - Live search tab with debounced keyword query & instant URL detection.
   - Live queue tab with "Now Playing" card, animated equalizer, and "Added by [Name]" badges.
   - Real-time toast feedback on queue actions via Sonner.

---

## 📄 License
MIT
