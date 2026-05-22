using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Overworld.Network
{
    // ──── Encounter ────────────────────────────────────────────────────────
    [Serializable]
    public class EncounterRequest
    {
        [JsonProperty("lat")]          public double lat;
        [JsonProperty("lng")]          public double lng;
        [JsonProperty("accuracy")]     public float accuracy;
        [JsonProperty("timestampMs")]  public long timestampMs;
        [JsonProperty("mockFlag")]     public bool mockFlag;
    }

    [Serializable]
    public class EchoSpawnData
    {
        [JsonProperty("echoId")]          public string echoId;
        [JsonProperty("type")]            public string type;
        [JsonProperty("bp")]              public int bp;
        [JsonProperty("spawnLat")]        public double spawnLat;
        [JsonProperty("spawnLng")]        public double spawnLng;
        [JsonProperty("spawnedAt")]       public long spawnedAt;
        [JsonProperty("expiresAt")]       public long expiresAt;
        [JsonProperty("encounterToken")]  public string encounterToken;
    }

    [Serializable]
    public class EncounterResponse
    {
        [JsonProperty("triggered")]             public bool triggered;
        [JsonProperty("echo")]                  public EchoSpawnData echo;
        [JsonProperty("distanceAccumulated")]   public float distanceAccumulated;
        [JsonProperty("nextThresholdM")]        public float nextThresholdM;
        [JsonProperty("error")]                 public string error;
    }

    // ──── Battle ────────────────────────────────────────────────────────────
    [Serializable]
    public class BattleRequest
    {
        [JsonProperty("echoId")]          public string echoId;
        [JsonProperty("encounterToken")]  public string encounterToken;
        [JsonProperty("echoBP")]          public int echoBP;
        [JsonProperty("echoType")]        public string echoType;
        [JsonProperty("spawnTimestamp")]  public long spawnTimestamp;
    }

    [Serializable]
    public class LootItem
    {
        [JsonProperty("itemId")]    public string itemId;
        [JsonProperty("itemType")] public string itemType;
        [JsonProperty("tier")]     public int tier;
        [JsonProperty("bpValue")]  public int bpValue;
        [JsonProperty("quantity")] public int quantity;
    }

    [Serializable]
    public class BattleResult
    {
        [JsonProperty("echoId")]       public string echoId;
        [JsonProperty("outcome")]      public string outcome;
        [JsonProperty("loot")]         public List<LootItem> loot;
        [JsonProperty("xpGained")]     public int xpGained;
        [JsonProperty("cooldownUntil")] public long cooldownUntil;
        [JsonProperty("newBP")]        public int newBP;
    }

    [Serializable]
    public class BattleResponse
    {
        [JsonProperty("result")]     public BattleResult result;
        [JsonProperty("lootToken")]  public string lootToken;
        [JsonProperty("error")]      public string error;
    }

    // ──── Loot Claim ────────────────────────────────────────────────────────
    [Serializable]
    public class LootClaimRequest
    {
        [JsonProperty("lootToken")]  public string lootToken;
        [JsonProperty("battleId")]   public string battleId;
        [JsonProperty("timestamp")]  public long timestamp;
        [JsonProperty("items")]      public List<LootItem> items;
    }

    // ──── Territory ─────────────────────────────────────────────────────────
    [Serializable]
    public class TerritoryBoundaryPoint
    {
        [JsonProperty("lat")] public double lat;
        [JsonProperty("lng")] public double lng;
    }

    [Serializable]
    public class HexRecord
    {
        [JsonProperty("hexIndex")]           public string hexIndex;
        [JsonProperty("ownerFaction")]       public string ownerFaction;
        [JsonProperty("capturedAtTimestamp")] public long capturedAtTimestamp;
        [JsonProperty("defenseScore")]       public int defenseScore;
        [JsonProperty("centerLat")]          public double centerLat;
        [JsonProperty("centerLng")]          public double centerLng;
        [JsonProperty("boundary")]           public List<TerritoryBoundaryPoint> boundary;
    }

    [Serializable]
    public class NearbyTerritoriesResponse
    {
        [JsonProperty("territories")] public List<HexRecord> territories;
    }

    [Serializable]
    public class CaptureRequest
    {
        [JsonProperty("hexIndex")]    public string hexIndex;
        [JsonProperty("lat")]         public double lat;
        [JsonProperty("lng")]         public double lng;
        [JsonProperty("accuracy")]    public float accuracy;
        [JsonProperty("timestampMs")] public long timestampMs;
    }

    [Serializable]
    public class CaptureResponse
    {
        [JsonProperty("success")]   public bool success;
        [JsonProperty("newOwner")]  public string newOwner;
        [JsonProperty("hexIndex")]  public string hexIndex;
        [JsonProperty("reason")]    public string reason;
    }

    // ──── Faction ────────────────────────────────────────────────────────────
    [Serializable]
    public class JoinFactionRequest
    {
        [JsonProperty("faction")] public string faction;
    }

    // ──── Player State ───────────────────────────────────────────────────────
    [Serializable]
    public class EquippedItems
    {
        [JsonProperty("coreFragmentIds")] public List<string> coreFragmentIds;
        [JsonProperty("echoCoreIds")]     public List<string> echoCoreIds;
        [JsonProperty("relicIds")]        public List<string> relicIds;
    }

    [Serializable]
    public class PlayerProfile
    {
        [JsonProperty("userId")]         public string userId;
        [JsonProperty("displayName")]    public string displayName;
        [JsonProperty("bp")]             public int bp;
        [JsonProperty("faction")]        public string faction;
        [JsonProperty("totalWalkDistanceMeters")] public int totalWalkDistanceMeters;
        [JsonProperty("cooldownUntil")]  public long cooldownUntil;
        [JsonProperty("equippedItems")]  public EquippedItems equippedItems;
    }

    [Serializable]
    public class InventorySlot
    {
        [JsonProperty("itemId")]    public string itemId;
        [JsonProperty("itemType")]  public string itemType;
        [JsonProperty("quantity")]  public int quantity;
        [JsonProperty("tier")]      public int tier;
        [JsonProperty("bpValue")]   public int bpValue;
    }

    [Serializable]
    public class PlayerStateResponse
    {
        [JsonProperty("profile")]   public PlayerProfile profile;
        [JsonProperty("inventory")] public Dictionary<string, InventorySlot> inventory;
    }

    // ──── Missions ───────────────────────────────────────────────────────────
    [Serializable]
    public class DailyMission
    {
        [JsonProperty("missionId")]      public string missionId;
        [JsonProperty("description")]    public string description;
        [JsonProperty("targetValue")]    public int targetValue;
        [JsonProperty("progress")]       public int progress;
        [JsonProperty("completed")]      public bool completed;
        [JsonProperty("claimed")]        public bool claimed;
        [JsonProperty("rewardItemId")]   public string rewardItemId;
        [JsonProperty("rewardQuantity")] public int rewardQuantity;
    }

    [Serializable]
    public class DailyMissionsResponse
    {
        [JsonProperty("missions")] public List<DailyMission> missions;
    }

    // ──── Equip ──────────────────────────────────────────────────────────────
    [Serializable]
    public class EquipItemRequest
    {
        [JsonProperty("itemId")] public string itemId;
        [JsonProperty("equip")]  public bool equip;
    }

    [Serializable]
    public class EquipItemResponse
    {
        [JsonProperty("success")] public bool success;
        [JsonProperty("newBP")]   public int newBP;
        [JsonProperty("error")]   public string error;
    }

    // ──── Generic ─────────────────────────────────────────────────────────────
    [Serializable]
    public class SimpleResponse
    {
        [JsonProperty("success")] public bool success;
        [JsonProperty("error")]   public string error;
    }
}
