import React, { useMemo, useState } from "react";
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
  User,
  Zap
} from "lucide-react";
import {
  applyBattleResult,
  calculatePlayerBattlePower,
  createInitialState,
  maybeCreateEncounter,
  resolveBattle,
  upgradePlayer,
  validateMovement
} from "./game/serverSimulator";
import { factions, upgradeCosts } from "./game/tuning";
import type { BattleResult, FactionId, GameState, TerritoryCell } from "./game/types";
import { CELL_GEO, MAP_CENTER, markerCount, scatterPositions } from "./game/mapData";
import "./styles.css";

type ActiveView = "world" | "map" | "character";

function App() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [lastBattle, setLastBattle] = useState<BattleResult | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("world");
  const playerBp = calculatePlayerBattlePower(state.player);

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
              onToggleWalk={toggleWalk}
              onSimulateStep={simulateStep}
              onFightEncounter={fightEncounter}
              onUpgrade={upgrade}
            />
          )}
          {activeView === "map" && (
            <MapView
              cells={state.territory}
              playerCellId={state.playerCellId}
              factionId={state.player.factionId}
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
  onToggleWalk,
  onSimulateStep,
  onFightEncounter,
  onUpgrade
}: {
  state: GameState;
  lastBattle: BattleResult | null;
  playerBp: number;
  onToggleWalk: () => void;
  onSimulateStep: () => void;
  onFightEncounter: () => void;
  onUpgrade: () => void;
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
        </div>
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
  factionId
}: {
  cells: TerritoryCell[];
  playerCellId: string;
  factionId: FactionId | null;
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

        {/* Player */}
        {playerGeo && (
          <Marker position={[playerGeo.lat, playerGeo.lng]} icon={playerIcon(playerColor)} />
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
