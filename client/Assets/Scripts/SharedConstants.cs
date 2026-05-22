namespace Overworld
{
    public static class SharedConstants
    {
        // RPC names — must match server/src/main.ts registrations
        public const string RPC_ENCOUNTER_REQUEST    = "rpc_encounter_request";
        public const string RPC_BATTLE_RESOLVE       = "rpc_battle_resolve";
        public const string RPC_LOOT_CLAIM           = "rpc_loot_claim";
        public const string RPC_CAPTURE_TERRITORY    = "rpc_capture_territory";
        public const string RPC_GET_NEARBY_TERRITORIES = "rpc_get_nearby_territories";
        public const string RPC_JOIN_FACTION         = "rpc_join_faction";
        public const string RPC_GET_PLAYER_STATE     = "rpc_get_player_state";
        public const string RPC_EQUIP_ITEM           = "rpc_equip_item";
        public const string RPC_GET_DAILY_MISSIONS   = "rpc_get_daily_missions";
        public const string RPC_CLAIM_MISSION_REWARD = "rpc_claim_mission_reward";
        public const string RPC_GET_LEADERBOARD      = "rpc_get_leaderboard";

        // Storage collections
        public const string COLLECTION_PLAYERS      = "player_profiles";
        public const string COLLECTION_INVENTORY    = "inventories";
        public const string COLLECTION_TERRITORIES  = "territories";
        public const string COLLECTION_FACTION_STATS = "faction_stats";
        public const string COLLECTION_MISSIONS     = "daily_missions";

        // Notification codes — must match server/src/modules/notificationModule.ts
        public const int NOTIF_TERRITORY_UPDATE  = 100;
        public const int NOTIF_FACTION_WAR       = 101;
        public const int NOTIF_NEARBY_PLAYER     = 102;
        public const int NOTIF_MISSION_COMPLETE  = 103;
        public const int NOTIF_LOOT_RECEIVED     = 104;
        public const int NOTIF_ENCOUNTER_READY   = 105;

        // Anti-cheat thresholds
        public const float GPS_SPEED_FLAG_KMH    = 30f;
        public const float GPS_SPEED_BLOCK_KMH   = 100f;
        public const float GPS_MAX_ACCURACY_M    = 50f;
        public const int   H3_TERRITORY_RES      = 8;

        // Faction names
        public const string FACTION_VEIL         = "veil";
        public const string FACTION_SURGE        = "surge";
        public const string FACTION_NULL         = "null_faction";
    }
}
