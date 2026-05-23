import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  Boxes,
  Compass,
  Footprints,
  Map,
  MapPin,
  Pause,
  Play,
  RadioTower,
  Shield,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  Zap
} from "lucide-react";
import {
  applyBattleResult,
  calculatePlayerBattlePower,
  createInitialState,
  generateFvFScores,
  generateOpponents,
  maybeCreateEncounter,
  resolveBattle,
  resolvePvpBattle,
  upgradePlayer,
  validateMovement
} from "./game/serverSimulator";
import { factions, upgradeCosts } from "./game/tuning";
import type { BattleResult, FactionId, GameState, PlayerOpponent, PvPResult, TerritoryCell } from "./game/types";
import { CELL_GEO, MAP_CENTER, cellForPosition, haversineMeters, markerCount, nearestCell, scatterPositions } from "./game/mapData";
import "./styles.css";

type ActiveView = "world" | "map" | "character";

// ── FvF state machine ─────────────────────────────────────────────
type FvFState =
  | { phase: "idle" }
  | { phase: "picking" }
  | { phase: "selecting"; enemyFactionId: FactionId; opponents: PlayerOpponent[] }
  | { phase: "result"; enemyFactionId: FactionId; pvpResult: PvPResult; factionScores: Record<FactionId, number> };

function App() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [lastBattle, setLastBattle] = useState<BattleResult | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("world");
  const [fvfState, setFvfState] = useState<FvFState>({ phase: "idle" });
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const playerBp = calculatePlayerBattlePower(state.player);

  // ── Real GPS tracking ─────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this device");
      return;
    }
    if (state.walkState !== "walking") return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const timestamp = pos.timestamp;
        setGpsPos({ lat, lng, accuracy });
        setGpsError(null);

        const last = lastGpsRef.current;
        if (last) {
          const distanceMeters = haversineMeters(last.lat, last.lng, lat, lng);
          const elapsedSeconds = (timestamp - last.timestamp) / 1000;
          if (distanceMeters > 0 && elapsedSeconds > 0) {
            const detectedCellId = cellForPosition(lat, lng) ?? nearestCell(lat, lng);
            const sample = { distanceMeters, elapsedSeconds, accuracyMeters: accuracy };
            setState((current) => {
              if (current.walkState !== "walking" || current.currentEncounter) return current;
              const movement = validateMovement(sample);
              if (!movement.accepted) {
                return {
                  ...current,
                  encounterLog: [
                    `GPS rejected: ${movement.rejectedReason ?? "unknown"}.`,
                    ...current.encounterLog
                  ].slice(0, 6)
                };
              }
              const nextState = {
                ...current,
                playerCellId: detectedCellId,
                creditedDistanceMeters: current.creditedDistanceMeters + movement.creditedMeters
              };
              const encounter = maybeCreateEncounter(nextState);
              const cellLabel = current.territory.find((c) => c.id === detectedCellId)?.label ?? detectedCellId;
              return {
                ...nextState,
                currentEncounter: encounter,
                encounterLog: encounter
                  ? [`${encounter.type} Echo near ${cellLabel}!`, ...current.encounterLog].slice(0, 6)
                  : [`+${Math.round(movement.creditedMeters)}m GPS · ${cellLabel}.`, ...current.encounterLog].slice(0, 6)
              };
            });
          }
        }
        lastGpsRef.current = { lat, lng, timestamp };
      },
      (err) => {
        setGpsError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [state.walkState]);

  function chooseFaction(factionId: FactionId) {
    setState((current) => ({
      ...current,
      player: { ...current.player, factionId },
      encounterLog: [
        `${factions.find((f) => f.id === factionId)?.name} signal linked.`,
        ...current.encounterLog
      ].slice(0, 6)
    }));
  }

  function toggleWalk() {
    setState((current) => ({
      ...current,
      walkState: current.walkState === "walking" ? "idle" : "walking",
      encounterLog: [
        current.walkState === "walking"
          ? "Walk session paused."
          : "Walk session started. Movement samples are being validated.",
        ...current.encounterLog
      ].slice(0, 6)
    }));
  }

  function simulateStep() {
    setState((current) => {
      if (current.walkState === "cooldown" && current.cooldownUntilTick !== null) {
        const nextTick = current.tick + 1;
        if (nextTick >= current.cooldownUntilTick) {
          return {
            ...current,
            tick: nextTick,
            walkState: "walking",
            cooldownUntilTick: null,
            encounterLog: ["Cooldown cleared. You can move again.", ...current.encounterLog].slice(0, 6)
          };
        }
        return {
          ...current,
          tick: nextTick,
          encounterLog: ["Cooldown active. Echo interference fading.", ...current.encounterLog].slice(0, 6)
        };
      }

      if (current.walkState !== "walking" || current.currentEncounter) {
        return current;
      }

      const tick = current.tick + 1;
      const cellIndex = Math.floor(tick / 3) % current.territory.length;
      const sample = {
        distanceMeters: 44 + (tick % 4) * 9,
        elapsedSeconds: 24,
        accuracyMeters: 12 + (tick % 3) * 6
      };
      const movement = validateMovement(sample);

      if (!movement.accepted) {
        return {
          ...current,
          tick,
          encounterLog: [
            `Movement rejected: ${movement.rejectedReason ?? "unknown reason"}.`,
            ...current.encounterLog
          ].slice(0, 6)
        };
      }

      const nextState = {
        ...current,
        tick,
        playerCellId: current.territory[cellIndex].id,
        creditedDistanceMeters: current.creditedDistanceMeters + movement.creditedMeters
      };
      const encounter = maybeCreateEncounter(nextState);

      return {
        ...nextState,
        currentEncounter: encounter,
        encounterLog: encounter
          ? [
              `${encounter.type} Echo manifested in ${current.territory[cellIndex].label}.`,
              ...current.encounterLog
            ].slice(0, 6)
          : [
              `+${Math.round(movement.creditedMeters)}m validated near ${current.territory[cellIndex].label}.`,
              ...current.encounterLog
            ].slice(0, 6)
      };
    });
  }

  function fightEncounter() {
    setState((current) => {
      if (!current.currentEncounter) return current;
      const result = resolveBattle(current.player, current.currentEncounter, current.tick * 313 + 77);
      setLastBattle(result);
      return applyBattleResult(current, result, current.player.factionId);
    });
  }

  function startFvF() {
    setFvfState({ phase: "picking" });
  }

  function pickEnemyFaction(enemyFactionId: FactionId) {
    const seed = state.tick * 541 + Math.round(state.creditedDistanceMeters) + 13;
    const opponents = generateOpponents(enemyFactionId, state.player.level, seed);
    setFvfState({ phase: "selecting", enemyFactionId, opponents });
  }

  function challengeOpponent(opponent: PlayerOpponent) {
    if (fvfState.phase !== "selecting" || !state.player.factionId) return;
    const seed = state.tick * 1009 + opponent.battlePower;
    const pvpResult = resolvePvpBattle(playerBp, opponent.battlePower, seed);
    const scoreSeed = state.tick * 373 + pvpResult.scoreGained + 7;
    const factionScores = generateFvFScores(
      pvpResult.scoreGained,
      state.player.factionId,
      fvfState.enemyFactionId,
      scoreSeed
    );
    setState((current) => ({
      ...current,
      encounterLog: [
        pvpResult.won
          ? `PvP victory vs ${opponent.name}. +${pvpResult.scoreGained} score.`
          : `PvP defeat vs ${opponent.name}. No score gained.`,
        ...current.encounterLog
      ].slice(0, 6)
    }));
    setFvfState({ phase: "result", enemyFactionId: fvfState.enemyFactionId, pvpResult, factionScores });
  }

  function endFvF() {
    setFvfState({ phase: "idle" });
  }

  function upgrade() {
    setState((current) => {
      const upgraded = upgradePlayer(current.player);
      const changed = upgraded !== current.player;
      return {
        ...current,
        player: upgraded,
        encounterLog: [
          changed ? "Core upgraded. Battle power increased." : "Need more fragments and Echo Cores.",
          ...current.encounterLog
        ].slice(0, 6)
      };
    });
  }

  return (
    <main className="shell">
      <section className="phone" aria-label="Overworld vertical slice">
        <div className="view-content">
          {activeView === "world" && (
            <WorldView
              state={state}
              lastBattle={lastBattle}
              playerBp={playerBp}
              fvfState={fvfState}
              gpsPos={gpsPos}
              gpsError={gpsError}
              onToggleWalk={toggleWalk}
              onSimulateStep={simulateStep}
              onFightEncounter={fightEncounter}
              onUpgrade={upgrade}
              onStartFvF={startFvF}
              onPickEnemy={pickEnemyFaction}
              onChallenge={challengeOpponent}
              onEndFvF={endFvF}
            />
          )}
          {activeView === "map" && (
            <MapView
              cells={state.territory}
              playerCellId={state.playerCellId}
              factionId={state.player.factionId}
              playerGpsPos={gpsPos ? [gpsPos.lat, gpsPos.lng] : undefined}
            />
          )}
          {activeView === "character" && (
            <CharacterView
              state={state}
              playerBp={playerBp}
              onUpgrade={upgrade}
              onChooseFaction={chooseFaction}
            />
          )}
        </div>
        <TabBar activeView={activeView} onSelect={setActiveView} />
      </section>
    </main>
  );
}

function WorldView({
  state,
  lastBattle,
  playerBp,
  fvfState,
  gpsPos,
  gpsError,
  onToggleWalk,
  onSimulateStep,
  onFightEncounter,
  onUpgrade,
  onStartFvF,
  onPickEnemy,
  onChallenge,
  onEndFvF
}: {
  state: GameState;
  lastBattle: BattleResult | null;
  playerBp: number;
  fvfState: FvFState;
  gpsPos: { lat: number; lng: number; accuracy: number } | null;
  gpsError: string | null;
  onToggleWalk: () => void;
  onSimulateStep: () => void;
  onFightEncounter: () => void;
  onUpgrade: () => void;
  onStartFvF: () => void;
  onPickEnemy: (id: FactionId) => void;
  onChallenge: (opp: PlayerOpponent) => void;
  onEndFvF: () => void;
}) {
  const selectedFaction = factions.find((f) => f.id === state.player.factionId);
  const currentCell = state.territory.find((cell) => cell.id === state.playerCellId);
  const encounterProgress = Math.min(
    100,
    Math.round((state.creditedDistanceMeters / state.nextEncounterAtMeters) * 100)
  );

  return (
    <>
      <div className="map-surface">
        <header className="top-hud">
          <div>
            <p className="eyebrow">AETHER Field</p>
            <h1>Overworld</h1>
          </div>
          <div className="bp-pill" title="Battle power">
            <Zap size={16} />
            <span>{playerBp}</span>
          </div>
        </header>

        <TerritoryMap
          cells={state.territory}
          playerCellId={state.playerCellId}
          factionId={state.player.factionId}
        />

        <div className="walk-card">
          <div className="walk-status">
            <div>
              <p className="eyebrow">{currentCell?.label ?? "Unknown cell"}</p>
              <strong>{selectedFaction?.name ?? "Drifter"}</strong>
            </div>
            <button className="icon-button" onClick={onToggleWalk} title="Start or pause walking">
              {state.walkState === "walking" ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>

          <div className="meter" aria-label="Encounter progress">
            <span style={{ width: `${encounterProgress}%` }} />
          </div>

          <div className="walk-meta">
            <span>
              <Footprints size={15} />
              {Math.round(state.creditedDistanceMeters)}m
            </span>
            <span>
              <RadioTower size={15} />
              {Math.max(0, Math.round(state.nextEncounterAtMeters - state.creditedDistanceMeters))}m
            </span>
            <span>
              <Activity size={15} />
              {state.walkState}
            </span>
          </div>

          {gpsPos && (
            <div className="gps-status gps-status--active">
              <span className="gps-dot" />
              GPS · ±{Math.round(gpsPos.accuracy)}m · {gpsPos.lat.toFixed(5)}, {gpsPos.lng.toFixed(5)}
            </div>
          )}
          {gpsError && (
            <div className="gps-status gps-status--error">
              <span className="gps-dot" />
              GPS error: {gpsError}
            </div>
          )}
          {!gpsPos && !gpsError && state.walkState === "walking" && (
            <div className="gps-status gps-status--waiting">
              <span className="gps-dot" />
              Waiting for GPS signal…
            </div>
          )}
        </div>

      </div>

      {!state.currentEncounter && (
        <div className="action-row-standalone">
          <button className="primary-button" onClick={onSimulateStep}>
            <Footprints size={18} />
            Simulate Walk
          </button>
          <button className="secondary-button" onClick={onUpgrade}>
            <Boxes size={18} />
            Upgrade
          </button>
          {state.player.factionId && fvfState.phase === "idle" && (
            <button className="fvf-trigger-btn" onClick={onStartFvF} title="Faction vs Faction">
              <Users size={18} />
              FvF
            </button>
          )}
        </div>
      )}

      {!state.currentEncounter && fvfState.phase !== "idle" && (
        <FvFPanel
          fvfState={fvfState}
          playerFactionId={state.player.factionId!}
          playerBp={playerBp}
          onPickEnemy={onPickEnemy}
          onChallenge={onChallenge}
          onEnd={onEndFvF}
        />
      )}

      {state.currentEncounter && (
        <section className="encounter-panel-standalone" aria-live="polite">
          <div className="encounter-panel-info">
            <p className="eyebrow">Echo Encounter</p>
            <h2>{state.currentEncounter.type} Echo</h2>
            <span className="encounter-level">LV {state.currentEncounter.level}</span>
          </div>
          <div className="echo-core">
            <Swords size={28} />
            <strong>{state.currentEncounter.battlePower}</strong>
          </div>
          <button className="primary-button" onClick={onFightEncounter}>
            <Swords size={18} />
            Auto Battle
          </button>
        </section>
      )}

      <div className="bottom-sheet">
        {lastBattle ? <BattleReadout battle={lastBattle} /> : null}
        <Log entries={state.encounterLog} />
      </div>
    </>
  );
}

const MAPBOX_TOKEN = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_MAPBOX_TOKEN as string | undefined;


function makeIcon(svgHtml: string, size: [number, number]) {
  return L.divIcon({ html: svgHtml, iconSize: size, iconAnchor: [size[0] / 2, size[1]], className: "" });
}

function leaderIcon(color: string) {
  return makeIcon(
    `<div class="map-marker" style="color:${color}">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
        <path d="M7 14L11 8L15 14L19 8L23 14H7Z" fill="#f0cb62"/>
        <rect x="7" y="14" width="16" height="3" rx="1" fill="#f0cb62"/>
        <circle cx="15" cy="25" r="5" fill="currentColor"/>
        <path d="M6 37c0-4.97 4.03-9 9-9s9 4.03 9 9" fill="currentColor"/>
      </svg>
    </div>`,
    [30, 38]
  );
}

function memberIcon(color: string) {
  return makeIcon(
    `<div class="map-marker map-marker--member" style="color:${color}">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        <circle cx="9" cy="6" r="4" fill="currentColor"/>
        <path d="M1 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill="currentColor"/>
        <line x1="5" y1="13" x2="13" y2="20" stroke="rgba(255,255,255,0.75)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="4" y1="14" x2="6" y2="12" stroke="rgba(255,255,255,0.75)" stroke-width="1" stroke-linecap="round"/>
      </svg>
    </div>`,
    [18, 22]
  );
}

function playerIcon(color: string) {
  return makeIcon(
    `<div class="map-marker map-marker--player" style="color:${color}">
      <svg width="26" height="32" viewBox="0 0 26 32" fill="none">
        <circle cx="13" cy="11" r="11" fill="rgba(255,255,255,0.18)" stroke="currentColor" stroke-width="2.5"/>
        <circle cx="13" cy="7" r="4" fill="currentColor"/>
        <path d="M5 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill="currentColor"/>
      </svg>
    </div>`,
    [26, 32]
  );
}

function MapView({
  cells,
  playerCellId,
  factionId,
  playerGpsPos
}: {
  cells: TerritoryCell[];
  playerCellId: string;
  factionId: FactionId | null;
  playerGpsPos?: [number, number]; // [lat, lng] real GPS, overrides cell center
}) {
  const markers = useMemo(() => {
    const leaderCell: Partial<Record<FactionId, string>> = {};
    for (const f of factions) {
      let best = "", bestVal = 0;
      for (const cell of cells) {
        if (cell.influence[f.id] > bestVal) { bestVal = cell.influence[f.id]; best = cell.id; }
      }
      leaderCell[f.id] = best;
    }
    const result: { lat: number; lng: number; color: string; isLeader: boolean; key: string }[] = [];
    for (const cell of cells) {
      for (const f of factions) {
        const count = markerCount(cell.influence[f.id], cell.activity);
        scatterPositions(cell.id, f.id, count).forEach(([lng, lat], i) => {
          result.push({ lat, lng, color: f.color, isLeader: i === 0 && leaderCell[f.id] === cell.id, key: `${cell.id}-${f.id}-${i}` });
        });
      }
    }
    return result;
  }, [cells]);

  const tileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  const playerGeo = CELL_GEO[playerCellId];
  const playerColor = factions.find((f) => f.id === factionId)?.color ?? "#f4f7e8";
  // Use real GPS position if available, otherwise fall back to cell center
  const playerPos: [number, number] | undefined =
    playerGpsPos ?? (playerGeo ? [playerGeo.lat, playerGeo.lng] : undefined);

  return (
    <div className="map-gl-container">
      <MapContainer
        center={[MAP_CENTER[1], MAP_CENTER[0]]}
        zoom={15}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer url={tileUrl} tileSize={256} attribution="" />

        {/* Territory circles */}
        {cells.map((cell) => {
          const geo = CELL_GEO[cell.id];
          if (!geo) return null;
          const owner = factions.find((f) => f.id === cell.owner);
          const color = owner?.color ?? "#6b7c78";
          return (
            <Circle
              key={cell.id}
              center={[geo.lat, geo.lng]}
              radius={geo.radiusKm * 1000}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.28, weight: 2, opacity: 0.7 }}
            />
          );
        })}

        {/* Faction soldiers */}
        {markers.map((m) => (
          <Marker
            key={m.key}
            position={[m.lat, m.lng]}
            icon={m.isLeader ? leaderIcon(m.color) : memberIcon(m.color)}
          />
        ))}

        {/* Player — real GPS position if available, else cell center */}
        {playerPos && (
          <Marker position={playerPos} icon={playerIcon(playerColor)} />
        )}
      </MapContainer>

      <div className="map-legend-overlay">
        {factions.map((f) => (
          <span key={f.id} className="legend-chip">
            <i style={{ background: f.color }} />
            {f.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function CharacterView({
  state,
  playerBp,
  onUpgrade,
  onChooseFaction
}: {
  state: GameState;
  playerBp: number;
  onUpgrade: () => void;
  onChooseFaction: (factionId: FactionId) => void;
}) {
  const { player } = state;
  const xpNeeded = player.level * 100;
  const xpPct = Math.min(100, Math.round((player.xp / xpNeeded) * 100));

  const bpBreakdown = {
    base: player.baseBattlePower,
    level: player.level * 10,
    fragments: Math.round(player.inventory.coreFragments * 0.7),
    cores: player.inventory.echoCores * 8,
    relics: player.inventory.relics * 16
  };

  const canUpgrade =
    player.inventory.coreFragments >= upgradeCosts.coreFragments &&
    player.inventory.echoCores >= upgradeCosts.echoCores;

  const selectedFaction = factions.find((f) => f.id === player.factionId);

  return (
    <div className="character-view">
      <div className="stat-section">
        <p className="eyebrow">Agent Profile</p>
        <div className="identity-row">
          <div className="level-badge">
            <span className="eyebrow">LV</span>
            <strong>{player.level}</strong>
          </div>
          <div className="identity-info">
            <div className="xp-bar-wrap">
              <div className="xp-bar">
                <span style={{ width: `${xpPct}%` }} />
              </div>
              <span className="xp-label">
                {player.xp} / {xpNeeded} XP
              </span>
            </div>
            <span className="muted-row">
              <Footprints size={13} />
              {Math.round(state.creditedDistanceMeters)}m total walked
            </span>
          </div>
        </div>
      </div>

      <div className="stat-section">
        <p className="eyebrow">Battle Power</p>
        <div className="bp-total">
          <Zap size={18} />
          {playerBp}
        </div>
        <div className="bp-breakdown">
          <div className="bp-row">
            <span>Base</span>
            <span>{bpBreakdown.base}</span>
          </div>
          <div className="bp-row">
            <span>Level bonus</span>
            <span>+{bpBreakdown.level}</span>
          </div>
          <div className="bp-row">
            <span>Fragments</span>
            <span>+{bpBreakdown.fragments}</span>
          </div>
          <div className="bp-row">
            <span>Echo Cores</span>
            <span>+{bpBreakdown.cores}</span>
          </div>
          <div className="bp-row">
            <span>Relics</span>
            <span>+{bpBreakdown.relics}</span>
          </div>
        </div>
      </div>

      <div className="stat-section">
        <p className="eyebrow">Inventory</p>
        <div className="inventory-cards">
          <div className="inventory-card">
            <Boxes size={22} />
            <strong>{player.inventory.coreFragments}</strong>
            <span>Fragments</span>
          </div>
          <div className="inventory-card">
            <Zap size={22} />
            <strong>{player.inventory.echoCores}</strong>
            <span>Echo Cores</span>
          </div>
          <div className="inventory-card">
            <Shield size={22} />
            <strong>{player.inventory.relics}</strong>
            <span>Relics</span>
          </div>
        </div>
      </div>

      <div className="stat-section upgrade-section">
        <p className="eyebrow">Core Upgrade</p>
        <p className="upgrade-cost-label">
          {upgradeCosts.coreFragments} Fragments + {upgradeCosts.echoCores} Cores → +14 BP
        </p>
        <button
          className={canUpgrade ? "primary-button" : "secondary-button"}
          onClick={onUpgrade}
          disabled={!canUpgrade}
        >
          <Boxes size={16} />
          {canUpgrade
            ? "Upgrade Core"
            : `Need ${upgradeCosts.coreFragments}F + ${upgradeCosts.echoCores}C`}
        </button>
      </div>

      <div className="stat-section">
        <p className="eyebrow">Faction</p>
        <FactionPicker selected={player.factionId} onChoose={onChooseFaction} />
        {selectedFaction && <p className="faction-motto">{selectedFaction.motto}</p>}
      </div>
    </div>
  );
}

function TabBar({
  activeView,
  onSelect
}: {
  activeView: ActiveView;
  onSelect: (view: ActiveView) => void;
}) {
  return (
    <nav className="tab-bar" aria-label="Main navigation">
      <button
        className={`tab-button${activeView === "world" ? " active" : ""}`}
        onClick={() => onSelect("world")}
        aria-label="World view"
      >
        <Footprints size={20} />
        <span>World</span>
      </button>
      <button
        className={`tab-button${activeView === "map" ? " active" : ""}`}
        onClick={() => onSelect("map")}
        aria-label="Map view"
      >
        <Map size={20} />
        <span>Map</span>
      </button>
      <button
        className={`tab-button${activeView === "character" ? " active" : ""}`}
        onClick={() => onSelect("character")}
        aria-label="Character view"
      >
        <User size={20} />
        <span>Agent</span>
      </button>
    </nav>
  );
}

function FvFPanel({
  fvfState,
  playerFactionId,
  playerBp,
  onPickEnemy,
  onChallenge,
  onEnd
}: {
  fvfState: FvFState;
  playerFactionId: FactionId;
  playerBp: number;
  onPickEnemy: (id: FactionId) => void;
  onChallenge: (opp: PlayerOpponent) => void;
  onEnd: () => void;
}) {
  const otherFactions = factions.filter((f) => f.id !== playerFactionId);

  if (fvfState.phase === "picking") {
    return (
      <section className="fvf-panel">
        <div className="fvf-header">
          <p className="eyebrow">Faction vs Faction</p>
          <h2>Choose Enemy Faction</h2>
        </div>
        <div className="fvf-faction-pick">
          {otherFactions.map((f) => (
            <button
              key={f.id}
              className="fvf-faction-btn"
              style={{ "--accent": f.color } as React.CSSProperties}
              onClick={() => onPickEnemy(f.id)}
            >
              <Shield size={16} />
              {f.name}
            </button>
          ))}
        </div>
        <button className="secondary-button fvf-cancel" onClick={onEnd}>
          Cancel
        </button>
      </section>
    );
  }

  if (fvfState.phase === "selecting") {
    const enemyFaction = factions.find((f) => f.id === fvfState.enemyFactionId)!;
    return (
      <section className="fvf-panel">
        <div className="fvf-header">
          <p className="eyebrow">Enemy Found</p>
          <h2 style={{ color: enemyFaction.color }}>{enemyFaction.name}</h2>
          <span className="fvf-sub">Your BP: <strong>{playerBp}</strong> · Pick a target</span>
        </div>
        <div className="fvf-opponents">
          {fvfState.opponents.map((opp) => {
            const odds = Math.round((playerBp / (playerBp + opp.battlePower)) * 100);
            return (
              <div key={opp.id} className="fvf-opponent-card">
                <div className="fvf-opp-info">
                  <strong>{opp.name}</strong>
                  <span className="eyebrow">LV {opp.level}</span>
                </div>
                <div className="fvf-opp-bp">
                  <Zap size={13} />
                  {opp.battlePower}
                  <span className="fvf-odds">{odds}%</span>
                </div>
                <button
                  className="fvf-challenge-btn"
                  style={{ "--accent": enemyFaction.color } as React.CSSProperties}
                  onClick={() => onChallenge(opp)}
                >
                  <Target size={14} />
                  Fight
                </button>
              </div>
            );
          })}
        </div>
        <button className="secondary-button fvf-cancel" onClick={onEnd}>
          Retreat
        </button>
      </section>
    );
  }

  if (fvfState.phase === "result") {
    const { pvpResult, factionScores } = fvfState;
    const sorted = factions
      .filter((f) => factionScores[f.id] > 0)
      .sort((a, b) => factionScores[b.id] - factionScores[a.id]);
    const winner = sorted[0];
    const myFaction = factions.find((f) => f.id === playerFactionId)!;
    const myWonFvF = winner?.id === playerFactionId;

    return (
      <section className="fvf-panel">
        <div className={`fvf-pvp-result ${pvpResult.won ? "won" : "lost"}`}>
          <Compass size={16} />
          <span>{pvpResult.won ? "PvP Victory" : "PvP Defeat"}</span>
          <span className="fvf-pvp-detail">
            {pvpResult.myBp} vs {pvpResult.enemyBp} BP · {Math.round(pvpResult.winProbability * 100)}% odds
          </span>
          {pvpResult.won && <span className="fvf-score-gained">+{pvpResult.scoreGained} pts</span>}
        </div>

        <div className="fvf-score-tally">
          <p className="eyebrow">Faction War Score</p>
          {factions.map((f) => {
            const score = factionScores[f.id];
            if (!score) return null;
            const isWinner = f.id === winner?.id;
            return (
              <div
                key={f.id}
                className={`fvf-score-row ${isWinner ? "winner" : ""}`}
                style={{ "--accent": f.color } as React.CSSProperties}
              >
                <span
                  className="fvf-score-faction"
                  style={{ color: f.color }}
                >
                  {f.name}
                </span>
                <strong>{score}</strong>
                {isWinner && (
                  <span className="winner-badge">
                    <Trophy size={11} />
                    WINS
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={`fvf-war-verdict ${myWonFvF ? "won" : "lost"}`}>
          {myWonFvF ? `${myFaction.name} dominates this war!` : `${myFaction.name} fell short. Train harder.`}
        </div>

        <button className="primary-button" onClick={onEnd}>
          Done
        </button>
      </section>
    );
  }

  return null;
}

function TerritoryMap({
  cells,
  playerCellId,
  factionId
}: {
  cells: TerritoryCell[];
  playerCellId: string;
  factionId: FactionId | null;
}) {
  return (
    <div className="territory-grid" aria-label="Territory map">
      {cells.map((cell) => {
        const owner = factions.find((item) => item.id === cell.owner);
        const isPlayer = cell.id === playerCellId;
        const influenceTotal = Object.values(cell.influence).reduce((sum, value) => sum + value, 0);

        return (
          <button
            key={cell.id}
            className={`territory-cell ${isPlayer ? "is-player" : ""}`}
            style={{
              borderColor: owner?.color ?? "rgba(255,255,255,.2)",
              background: `linear-gradient(135deg, ${owner?.color ?? "#5f6d68"}33, rgba(8,17,15,.82))`
            }}
            title={`${cell.label}: ${owner?.name ?? "contested"}`}
          >
            <span>{cell.label}</span>
            <small>{owner?.name ?? "Contested"}</small>
            <i style={{ height: `${Math.max(18, Math.min(76, influenceTotal / 2))}%` }} />
            {isPlayer ? (
              <b style={{ color: factions.find((item) => item.id === factionId)?.color ?? "#f1f5da" }}>
                <MapPin size={16} />
              </b>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FactionPicker({
  selected,
  onChoose
}: {
  selected: FactionId | null;
  onChoose: (factionId: FactionId) => void;
}) {
  return (
    <div className="faction-picker">
      {factions.map((faction) => (
        <button
          key={faction.id}
          className={selected === faction.id ? "selected" : ""}
          style={{ "--accent": faction.color } as React.CSSProperties}
          onClick={() => onChoose(faction.id)}
        >
          <Shield size={16} />
          <span>{faction.name}</span>
        </button>
      ))}
    </div>
  );
}

function BattleReadout({ battle }: { battle: BattleResult }) {
  const odds = useMemo(() => Math.round(battle.winProbability * 100), [battle.winProbability]);

  return (
    <div className={`battle-readout ${battle.won ? "won" : "lost"}`}>
      <Compass size={17} />
      <span>{battle.won ? "Victory" : "Defeat"}</span>
      <small>
        {battle.playerBattlePower} vs {battle.enemyBattlePower} BP · {odds}% odds
      </small>
    </div>
  );
}

function Log({ entries }: { entries: string[] }) {
  return (
    <ol className="log">
      {entries.map((entry, index) => (
        <li key={`${entry}-${index}`}>{entry}</li>
      ))}
    </ol>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
