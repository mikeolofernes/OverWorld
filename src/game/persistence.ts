import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import type { FactionId, GameState, TerritoryCell } from "./types";

// Only the fields we persist — walkState / encounter / tick are ephemeral
export interface SavedPlayerState {
  username: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  player: {
    level: number;
    xp: number;
    baseBattlePower: number;
    factionId: FactionId | null;
    inventory: {
      coreFragments: number;
      echoCores: number;
      relics: number;
    };
  };
  playerCellId: string;
  territory: TerritoryCell[];
  creditedDistanceMeters: number;
  encounterLog: string[];
}

export async function loadPlayer(uid: string): Promise<SavedPlayerState | null> {
  const ref = doc(db, "players", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as SavedPlayerState;
}

export async function savePlayer(uid: string, username: string, state: GameState): Promise<void> {
  const ref = doc(db, "players", uid);
  const saved: Omit<SavedPlayerState, "createdAt"> & { updatedAt: unknown } = {
    username,
    updatedAt: serverTimestamp(),
    player: state.player,
    playerCellId: state.playerCellId,
    territory: state.territory,
    creditedDistanceMeters: state.creditedDistanceMeters,
    encounterLog: state.encounterLog
  };
  await setDoc(ref, saved, { merge: true });
}

export async function createPlayer(uid: string, username: string, state: GameState): Promise<void> {
  const ref = doc(db, "players", uid);
  await setDoc(ref, {
    username,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    player: state.player,
    playerCellId: state.playerCellId,
    territory: state.territory,
    creditedDistanceMeters: state.creditedDistanceMeters,
    encounterLog: state.encounterLog
  });
}
