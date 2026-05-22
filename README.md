# Overworld

> "The world was already divided. You didn't know it yet."

A GPS-based real-world territory conquest mobile game for iOS and Android. Walk in the real world, encounter Echoes, fight auto-battles, and compete for faction control over real geography.

## Core Loop

**Walk → Encounter Echo → Auto Battle → Loot → Upgrade → Faction Wars**

---

## Repository Structure

| Directory | Contents |
|---|---|
| `client/` | Unity 2022 LTS project (iOS + Android) |
| `server/` | Nakama TypeScript runtime (authoritative game logic) |
| `infrastructure/` | Docker Compose for local dev |
| `docs/` | Technical design documents |
| `.github/workflows/` | CI/CD pipelines |

---

## Quick Start (Local Development)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker + Docker Compose
- [Node.js 22+](https://nodejs.org/)
- [Unity 2022.3 LTS](https://unity.com/releases/editor/qa/lts-releases)
- A [Mapbox](https://account.mapbox.com/) account (free tier works)

### 1. Build the server bundle

```bash
cd server
npm install
npm run build
# outputs: server/build/main.js
```

### 2. Start the backend

```bash
cd infrastructure
docker compose up -d
```

- **Nakama Console:** http://localhost:7351 (admin / admin)
- **Nakama API:** http://localhost:7350
- **WebSocket:** ws://localhost:7349

Confirm the runtime loaded: open the console → Runtime → verify `main.js` appears.

### 3. Run server tests

```bash
cd server
npm test
```

### 4. Open the Unity project

1. Open Unity Hub → Add → select `client/` directory
2. Open with Unity 2022.3 LTS
3. Import Mapbox Unity SDK `.unitypackage` from [Mapbox releases](https://github.com/mapbox/mapbox-unity-sdk/releases)
4. Set your Mapbox token: `Assets/Resources/MapboxConfig`
5. Set Nakama config: `Assets/Resources/NakamaConfig` → host `localhost`, port `7350`
6. Enter **Play Mode** — for GPS simulation in the Editor, add `TestGPSFeed` component alongside `GPSManager`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile client | Unity 2022 LTS (C#) |
| Maps | Mapbox Unity SDK |
| Game server | [Nakama](https://heroiclabs.com/nakama/) (TypeScript runtime) |
| Database | PostgreSQL 14 (local dev) / CockroachDB (production) |
| CI/CD | GitHub Actions + game-ci/unity-builder |

---

## Architecture Highlights

### Authoritative Server

All game outcomes are resolved server-side. The client never computes battle results or loot drops — it only sends intent and renders the outcome.

### Anti-Cheat

| Check | Threshold | Action |
|---|---|---|
| GPS accuracy | > 50m | Reject sample |
| Speed | > 30 km/h | Flag (suspicious) |
| Speed | > 100 km/h | Block + increment violation |
| Teleport | Distance impossible for elapsed time | Block |
| Mock location | Android `mock_location` = 1 | Block + suspend |
| Static spoof | 4+ identical coordinates in history | Block |

Repeated violations (≥5 speed/teleport or ≥1 mock) trigger a 24-hour account suspension.

### Battle Formula

```
P(win) = PlayerBP / (PlayerBP + EchoBP)
```

Randomness is generated server-side using a seeded LCG seeded from `nk.uuidv4()`. The seed is never sent to the client.

### Territory System

Territories use [H3 hexagonal indexing](https://h3geo.org/) at resolution 8 (~460m hex edge). Capturing a zone requires the player to be within 200m of the hex center and have sufficient BP to overcome the zone's defense score.

### Player BP Formula

```
BP = 100 (base)
   + sum(CoreFragment bpValues)
   + sum(EchoCore bpValues) × (1 + 0.05 × numEquippedRelics)
   + sum(Relic bpValues)
```

Max equipped: 5 Core Fragments, 3 Echo Cores, 2 Relics.

---

## Factions

| Faction | Color |
|---|---|
| Veil | Purple |
| Surge | Orange |
| Null | Green |

Each faction gains a BP buff of +5% per 10 zones owned (max +25%) and a loot bonus of +2% per 10 zones (max +10%).

---

## MVP Scope

- [x] GPS tracking + encounter trigger (100–500m)
- [x] Echo system (Common / Elite / Apex)
- [x] Auto-battle resolution (server authoritative)
- [x] Loot system with token-secured claim flow
- [x] Faction join + territory capture
- [x] Daily missions
- [x] Anti-cheat (speed, mock, teleport, static spoof)
- [x] Nakama leaderboards
- [ ] Mapbox map rendering (requires Unity Editor + Mapbox SDK import)
- [ ] Full UI scenes (prefabs/scenes created in Unity Editor)

---

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `server-ci.yml` | Push/PR to `server/` | Typecheck, test, bundle |
| `unity-build.yml` | Push to `main` on `client/` | Unity tests, Android APK, iOS Xcode project |

Required GitHub secrets: `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASS`, `ANDROID_KEYALIAS_PASS`.
