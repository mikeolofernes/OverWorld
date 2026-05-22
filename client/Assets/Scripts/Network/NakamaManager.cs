using System;
using System.Threading.Tasks;
using UnityEngine;
using Nakama;
using Newtonsoft.Json;

namespace Overworld.Network
{
    public class NakamaManager : MonoBehaviour
    {
        public static NakamaManager Instance { get; private set; }

        public IClient Client { get; private set; }
        public ISession Session { get; private set; }
        public ISocket Socket { get; private set; }

        [SerializeField] private string scheme = "http";
        [SerializeField] private string host = "localhost";
        [SerializeField] private int port = 7350;
        [SerializeField] private string serverKey = "overworld-local-key";

        private const string SessionPrefsKey = "nakama_session";

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private async void Start()
        {
            Client = new Nakama.Client(scheme, host, port, serverKey);
            await AuthenticateAsync();
        }

        private async Task AuthenticateAsync()
        {
            var savedSession = PlayerPrefs.GetString(SessionPrefsKey, null);
            if (!string.IsNullOrEmpty(savedSession))
            {
                Session = Nakama.Session.Restore(savedSession);
                if (!Session.IsExpired)
                {
                    await ConnectSocketAsync();
                    return;
                }
            }

            string deviceId = SystemInfo.deviceUniqueIdentifier;
            Session = await Client.AuthenticateDeviceAsync(deviceId, null, true);
            PlayerPrefs.SetString(SessionPrefsKey, Session.AuthToken);
            await ConnectSocketAsync();
        }

        private async Task ConnectSocketAsync()
        {
            Socket = Client.NewSocket();
            Socket.Connected += () => Debug.Log("[Nakama] Socket connected");
            Socket.Closed += () => Debug.Log("[Nakama] Socket closed");
            Socket.ReceivedNotification += NotificationHandler.Instance?.Handle;
            await Socket.ConnectAsync(Session, true);
        }

        public async Task<T> RpcAsync<T>(string rpcId, object payload)
        {
            string payloadJson = JsonConvert.SerializeObject(payload);
            var response = await Client.RpcAsync(Session, rpcId, payloadJson);
            return JsonConvert.DeserializeObject<T>(response.Payload);
        }

        public async Task<EncounterResponse> SendEncounterRequestAsync(EncounterRequest req) =>
            await RpcAsync<EncounterResponse>("rpc_encounter_request", req);

        public async Task<BattleResponse> SendBattleResolveAsync(BattleRequest req) =>
            await RpcAsync<BattleResponse>("rpc_battle_resolve", req);

        public async Task<SimpleResponse> SendLootClaimAsync(LootClaimRequest req) =>
            await RpcAsync<SimpleResponse>("rpc_loot_claim", req);

        public async Task<CaptureResponse> SendCaptureAsync(CaptureRequest req) =>
            await RpcAsync<CaptureResponse>("rpc_capture_territory", req);

        public async Task<NearbyTerritoriesResponse> GetNearbyTerritoriesAsync(double lat, double lng) =>
            await RpcAsync<NearbyTerritoriesResponse>("rpc_get_nearby_territories", new { lat, lng });

        public async Task<SimpleResponse> JoinFactionAsync(string faction) =>
            await RpcAsync<SimpleResponse>("rpc_join_faction", new JoinFactionRequest { faction = faction });

        public async Task<PlayerStateResponse> GetPlayerStateAsync() =>
            await RpcAsync<PlayerStateResponse>("rpc_get_player_state", new { });

        public async Task<EquipItemResponse> EquipItemAsync(string itemId, bool equip) =>
            await RpcAsync<EquipItemResponse>("rpc_equip_item", new EquipItemRequest { itemId = itemId, equip = equip });

        public async Task<DailyMissionsResponse> GetDailyMissionsAsync() =>
            await RpcAsync<DailyMissionsResponse>("rpc_get_daily_missions", new { });

        public async Task<SimpleResponse> ClaimMissionRewardAsync(string missionId) =>
            await RpcAsync<SimpleResponse>("rpc_claim_mission_reward", new { missionId });
    }
}
