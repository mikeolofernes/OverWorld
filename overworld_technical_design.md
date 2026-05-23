# Overworld Technical Design Document

## 1. Product Summary

Overworld is a cross-platform GPS-based territory conquest game for iOS and Android. Players physically walk through the real world to trigger encounters, fight server-resolved auto battles, earn loot, upgrade their character, and contribute to faction control over real-world territory.

Core loop:

```text
Walk -> Encounter Echo -> Auto Battle -> Loot -> Upgrade -> Faction Wars
```

Core design rule:

```text
Movement in real world = progression in game
```

## 2. MVP Goals

The MVP should prove that real walking can safely and satisfyingly drive progression.

Required MVP features:

- Account creation and player profile
- GPS tracking with distance and speed validation
- Encounter generation every 100-500 meters of validated walking
- Echo enemy generation: Common, Elite, Apex
- Server-authoritative auto battles
- Loot and XP rewards
- Basic item-based upgrades
- Faction selection
- Territory contribution and faction ownership display
- Minimal walking HUD
- Tutorial walk onboarding
- Admin/debug tools for tuning encounter, loot, and movement rules

Out of MVP:

- Large-scale faction war scheduling
- World-scale AETHER anomalies
- Complex social features
- Real-money economy
- Trading
- AR combat
- Advanced guild/clan systems

## 3. Recommended Technology Stack

### Mobile Client

Recommended engine:

- Unity 6 LTS or current stable Unity LTS
- C#
- Universal Render Pipeline for lightweight mobile rendering
- Addressables for content delivery
- Unity Gaming Services only where useful, not as the source of authoritative gameplay truth

Rationale:

- Cross-platform iOS and Android builds from one codebase
- Strong mobile profiling and rendering tools
- Suitable for map-based UI, lightweight 3D/2D Echo presentation, effects, and future AR-like presentation
- Mature native plugin ecosystem for device permissions, push, analytics, and integrity signals

### Mapping

Recommended MVP path:

- Mapbox Maps SDK for Unity for map visualization and custom styling
- Server-side geospatial logic in PostGIS

Important platform note:

- Google Maps Platform Gaming Services for Unity should not be treated as a primary path because Google lists the gaming services as deprecated and shut down.
- Google Maps Platform may still be evaluated for non-Unity native map use, Places/POI data, or future companion services, but it should not anchor the Unity MVP.

### Backend

Recommended backend:

- TypeScript with NestJS or Fastify
- PostgreSQL with PostGIS
- Redis for rate limiting, ephemeral movement sessions, matchmaking-like queues, and cooldowns
- WebSocket gateway for live territory and faction updates
- Object storage for config snapshots, logs, and build artifacts

Recommended hosting:

- Containerized backend on AWS, GCP, Azure, Fly.io, Render, or similar
- Managed Postgres with PostGIS support
- CDN-backed static config delivery

### Observability

- Structured logs with request/player/session correlation IDs
- Metrics for location submissions, rejected movement, encounter rolls, battle outcomes, loot grants, and territory changes
- Error reporting for Unity client crashes
- Admin dashboard for player audit trails and tuning tables

## 4. High-Level Architecture

```text
Unity Mobile Client
  - GPS sampling
  - Walking HUD
  - Map rendering
  - Encounter presentation
  - Inventory and faction UI
  - Local prediction for feel only

API Gateway
  - Auth
  - Rate limits
  - Version checks
  - Request validation

Movement Service
  - Location ingestion
  - Speed validation
  - Distance accumulation
  - Spoof risk scoring

Encounter Service
  - Validated distance thresholds
  - Echo spawn rolls
  - Encounter state

Battle Service
  - Server-side battle power calculation
  - Outcome resolution
  - Cooldown application

Loot Service
  - Reward tables
  - XP grants
  - Inventory mutation

Progression Service
  - Item upgrades
  - Player BP calculation
  - Relic effects

Faction Service
  - Faction membership
  - Territory contribution
  - Buff calculation

Territory Service
  - Geospatial territory cells
  - Ownership state
  - Control decay or conflict rules

Admin Tools
  - Tuning tables
  - Player audit
  - Anti-cheat review
```

## 5. Client Architecture

### Unity Scenes

- `BootScene`: dependency setup, version check, config fetch
- `LoginScene`: auth, account linking
- `OnboardingScene`: tutorial walk and first encounter
- `WorldScene`: map, GPS walking HUD, nearby territory
- `EncounterScene`: Echo reveal and battle presentation
- `InventoryScene`: loot, relics, upgrades
- `FactionScene`: faction selection, territory status, buffs

### Client Modules

- `LocationModule`: requests permissions, samples GPS, batches location points
- `MovementSessionModule`: starts/stops walking sessions and displays validation state
- `MapModule`: renders map, player marker, territories, and Echo events
- `EncounterModule`: displays server-created encounters
- `BattlePresentationModule`: animates battle result already decided by server
- `InventoryModule`: displays items and upgrade actions
- `FactionModule`: displays faction membership and territory ownership
- `NetworkModule`: API client, retries, auth headers, version handling
- `ConfigModule`: remote tuning tables and feature flags
- `TelemetryModule`: analytics, diagnostics, anti-cheat signal collection

### Client Trust Boundary

The client may report:

- GPS samples
- Device motion hints
- App foreground/background state
- Permission state
- User actions
- Presentation preferences

The client must not decide:

- Distance credited
- Encounter spawn success
- Enemy level or reward table
- Battle outcome
- Loot grants
- Territory ownership
- Faction buffs
- Cooldown expiry

## 6. Backend Services

### Auth Service

Responsibilities:

- Account creation
- Anonymous guest account support
- Apple and Google sign-in
- Session token issuing
- Player identity and ban state

### Movement Service

Responsibilities:

- Ingest location samples
- Validate sample freshness, accuracy, speed, and path plausibility
- Accumulate credited walking distance
- Emit `distance_credit_granted` events
- Flag suspicious sessions

Core rules:

- Ignore samples with poor reported accuracy
- Ignore stale or out-of-order samples
- Reject impossible speed spikes
- Down-weight movement during background or low-confidence device states
- Require route continuity before granting encounter progress

### Encounter Service

Responsibilities:

- Track player encounter meter
- Roll encounter thresholds between 100 and 500 meters
- Generate Echo type, level, battle power, and seed
- Create encounter records with expiry times

Encounter types:

- Common: frequent, low risk, common loot
- Elite: less frequent, higher BP, better loot
- Apex: rare, high BP, special loot and faction contribution

### Battle Service

Responsibilities:

- Calculate player battle power from level, items, relics, and buffs
- Calculate enemy battle power from encounter seed and tuning table
- Resolve outcome with:

```text
P(win) = Player BP / (Player BP + Enemy BP)
```

- Persist battle result
- Emit reward or cooldown event

Battle rules:

- The random seed and final roll live server-side.
- The client receives only the result and presentation data.
- Replays must be idempotent to prevent duplicate rewards.

### Loot Service

Responsibilities:

- Resolve loot tables
- Grant Core Fragments, Echo Cores, Relics, XP, and currency if added
- Enforce inventory limits
- Persist reward transactions

### Progression Service

Responsibilities:

- Upgrade player equipment or core stats
- Calculate battle power
- Apply relic modifiers
- Validate item costs

### Faction Service

Responsibilities:

- Faction selection
- Faction membership changes
- Buff calculation
- Contribution events from encounters and patrol routes

### Territory Service

Responsibilities:

- Divide geography into cells or zones
- Store faction control values
- Apply contribution from player actions
- Resolve ownership changes
- Serve territory overlays to the client

Recommended MVP territory model:

- Use H3 or S2 geospatial cells.
- Start with one resolution for city-scale play.
- Each cell stores faction influence values.
- Ownership belongs to the faction with the highest influence above a minimum threshold.

## 7. Data Model Draft

### `players`

- `id`
- `display_name`
- `created_at`
- `level`
- `xp`
- `base_bp`
- `faction_id`
- `ban_state`
- `last_active_at`

### `movement_sessions`

- `id`
- `player_id`
- `started_at`
- `ended_at`
- `credited_distance_m`
- `rejected_distance_m`
- `risk_score`
- `state`

### `location_samples`

- `id`
- `player_id`
- `session_id`
- `reported_at`
- `received_at`
- `lat`
- `lng`
- `accuracy_m`
- `speed_mps`
- `source`
- `accepted`
- `reject_reason`

### `encounters`

- `id`
- `player_id`
- `session_id`
- `echo_type`
- `echo_level`
- `echo_bp`
- `seed_hash`
- `status`
- `created_at`
- `expires_at`

### `battles`

- `id`
- `player_id`
- `encounter_id`
- `player_bp`
- `enemy_bp`
- `win_probability`
- `outcome`
- `server_roll_hash`
- `created_at`

### `inventory_items`

- `id`
- `player_id`
- `item_type`
- `item_key`
- `quantity`
- `metadata`

### `factions`

- `id`
- `name`
- `lore_key`
- `color`
- `created_at`

### `territory_cells`

- `cell_id`
- `resolution`
- `center_lat`
- `center_lng`
- `owning_faction_id`
- `updated_at`

### `territory_influence`

- `cell_id`
- `faction_id`
- `influence`
- `last_contribution_at`

## 8. API Draft

### Auth

- `POST /auth/guest`
- `POST /auth/apple`
- `POST /auth/google`
- `POST /auth/refresh`

### Config

- `GET /config/client`
- `GET /config/tuning`

### Movement

- `POST /movement/sessions/start`
- `POST /movement/samples`
- `POST /movement/sessions/end`
- `GET /movement/sessions/current`

### Encounters

- `GET /encounters/current`
- `POST /encounters/{encounterId}/battle`
- `POST /encounters/{encounterId}/discard`

### Player

- `GET /players/me`
- `GET /players/me/inventory`
- `POST /players/me/upgrades`

### Factions and Territory

- `GET /factions`
- `POST /factions/join`
- `GET /territory/nearby?lat={lat}&lng={lng}`
- `GET /territory/cells/{cellId}`

## 9. Anti-Cheat Design

Anti-cheat should be layered. The MVP should start with conservative server-side validation and observable risk scoring.

### Layer 1: Server Validation

- Reject impossible speed
- Reject teleporting movement
- Reject stale samples
- Reject samples with poor GPS accuracy
- Enforce minimum time between samples
- Cap credited distance per minute
- Require path continuity

### Layer 2: Device Signals

- Jailbreak/root detection
- Mock location flags where available
- Device integrity APIs:
  - Android Play Integrity API
  - Apple DeviceCheck and App Attest
- App tamper checks

### Layer 3: Behavioral Detection

- Repeated perfect-line movement
- Repeated high-speed stop/start patterns
- Abnormal encounter farming density
- Location jumps between distant territories
- Suspicious background-only progression

### Layer 4: Enforcement

- Soft reject movement samples
- Reduce encounter eligibility
- Shadow flag for review
- Temporary cooldown
- Temporary suspension
- Permanent ban for repeated high-confidence abuse

## 10. Territory and Faction Mechanics

MVP territory should be simple enough to tune:

- The world is divided into geospatial cells.
- Each faction has influence in each cell.
- Winning encounters contributes influence to the current cell.
- Elite and Apex Echoes grant more influence.
- Daily patrol routes can grant bonus influence after MVP.
- Territory ownership updates periodically or immediately after threshold changes.

Suggested MVP formula:

```text
influence_gain = base_echo_value * echo_rarity_multiplier * player_activity_modifier
```

Ownership:

```text
owning_faction = faction_with_highest_influence_if_above_minimum_threshold
```

Optional decay:

```text
daily_influence = influence * 0.98
```

Decay should wait until the game has enough active players to avoid making early maps feel empty.

## 11. UX Requirements

### Walking HUD

The walking HUD must be minimal and readable outdoors.

Required elements:

- Player position
- Current faction territory
- Distance to next possible encounter band
- Movement validation state
- Nearby Echo or territory alerts
- Battery/network warning states

Avoid:

- Dense text while walking
- Small touch targets
- Menus that require attention during movement
- Battle controls that encourage unsafe play

### Watch Mode

Watch Mode is a low-interaction state for observing territory and faction activity.

MVP version:

- Map remains visible
- Player can see nearby territory changes
- No active battle input
- Reduced location sampling where possible

### Tutorial Walk

The tutorial should guide a short real-world walk:

1. Explain location permissions.
2. Start a movement session.
3. Credit a short distance.
4. Trigger a scripted Common Echo.
5. Resolve a server battle.
6. Grant starter loot.
7. Prompt first upgrade.
8. Introduce factions after the player understands walking and battles.

## 12. Content and Tuning

Use remote tuning tables for:

- Encounter distance thresholds
- Echo rarity weights
- Echo battle power ranges
- Loot drop rates
- XP curves
- Upgrade costs
- Faction influence values
- Cooldown durations
- Speed and accuracy validation thresholds

Tuning tables should be versioned and auditable.

## 13. Build and Deployment

### Client

- Unity Cloud Build, GitHub Actions with Unity builder, or equivalent CI
- Separate dev, staging, and production builds
- Environment-specific API endpoints
- Automated smoke tests for startup and login
- TestFlight and Google Play Internal Testing tracks

### Backend

- Dockerized services
- Infrastructure as code
- Database migrations
- Separate dev, staging, and production databases
- Blue/green or rolling deployments
- Automated API tests

### Release Gates

- Client version compatible with backend config
- No critical crash regressions
- Movement validation dashboard healthy
- Reward duplication tests passing
- Battle idempotency tests passing
- Store privacy declarations updated for location usage

## 14. MVP Milestones

### Milestone 1: Foundation

- Unity project skeleton
- Backend API skeleton
- Auth
- Remote config
- Basic player profile
- Local dev and staging environments

### Milestone 2: Movement

- GPS permission flow
- Movement sessions
- Location sample submission
- Server distance crediting
- Basic anti-cheat validation
- Walking HUD

### Milestone 3: Encounters and Battles

- Encounter threshold system
- Echo generation
- Auto battle resolution
- Battle result presentation
- Cooldown handling

### Milestone 4: Loot and Progression

- Loot tables
- Inventory
- XP
- Upgrades
- Battle power recalculation

### Milestone 5: Factions and Territory

- Faction selection
- Territory cells
- Influence contribution
- Ownership display
- Basic faction buffs

### Milestone 6: Beta Hardening

- Tutorial walk
- Watch Mode
- Analytics
- Admin tools
- Anti-cheat dashboards
- Store build pipeline
- Closed beta readiness

## 15. Primary Risks

### GPS Accuracy and Player Trust

Risk:

- Real-world GPS can drift, especially in dense cities.

Mitigation:

- Use accuracy thresholds, smoothing, forgiving UX states, and transparent validation messaging.

### Cheating

Risk:

- GPS spoofing can break progression and faction competition.

Mitigation:

- Keep all reward logic server-side, use risk scoring, and tune enforcement gradually.

### Map and API Cost

Risk:

- Map rendering, POI, and geospatial APIs can become expensive.

Mitigation:

- Cache territory overlays, reduce unnecessary tile usage, and evaluate pricing before launch-scale features.

### Outdoor Safety

Risk:

- Players may interact while walking in unsafe areas.

Mitigation:

- Minimal HUD, passive battle presentation, no reaction-heavy combat, and clear safety prompts.

### Sparse Early Player Density

Risk:

- Territory conquest can feel empty without enough local players.

Mitigation:

- Use PvE faction contribution first, asynchronous territory control, and seeded AETHER activity.

## 16. Open Design Decisions

- Should Overworld use H3 or S2 cells for territory?
- Are factions global, regional, or season-specific?
- Can a player change faction, and what is the cooldown?
- Should battle power be fully deterministic from inventory or include stamina/temporary buffs?
- Should Apex Echoes be solo encounters, faction events, or both?
- What is the target session length for a daily walk?
- How much territory information is visible to players outside their current location?
- Should the game support offline walking credit, or require online validation?

## 17. Recommended Next Build Step

Build a vertical slice with one city-scale test map:

1. Unity client can log in and show the player on a Mapbox map.
2. Player starts a walking session.
3. Backend validates movement and credits distance.
4. Server creates a Common Echo after a test threshold.
5. Client shows the Echo.
6. Server resolves battle.
7. Loot is granted.
8. Player upgrades once.
9. Player joins a faction.
10. Victory contributes influence to the current territory cell.

This slice proves the core promise without requiring full live-service scale.

## 18. Source Notes

- Mapbox official Unity documentation currently describes the Maps SDK for Unity as a Unity toolkit for real map data and lists the current SDK version.
- Google's official Maps Platform deprecations page lists Google Maps Platform Gaming Services as deprecated and shut down.
