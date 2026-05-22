using System;
using System.Threading.Tasks;
using UnityEngine;
using Overworld.Network;
using Overworld.Echo;
using Overworld.Loot;

namespace Overworld.Battle
{
    public class BattleOrchestrator : MonoBehaviour
    {
        public static BattleOrchestrator Instance { get; private set; }

        public event Action<BattleResult> OnBattleComplete;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public async Task StartBattle(ActiveEcho echo)
        {
            var request = new BattleRequest
            {
                echoId = echo.echoId,
                encounterToken = echo.encounterToken,
                echoBP = echo.bp,
                echoType = echo.type.ToString().ToLower(),
                spawnTimestamp = echo.spawnedAt,
            };

            BattleResponse response;
            try
            {
                response = await NakamaManager.Instance.SendBattleResolveAsync(request);
            }
            catch (Exception e)
            {
                Debug.LogError($"[Battle] RPC failed: {e.Message}");
                return;
            }

            if (!string.IsNullOrEmpty(response.error))
            {
                Debug.LogWarning($"[Battle] Server error: {response.error}");
                return;
            }

            EchoManager.Instance.RemoveEcho(echo.echoId);
            OnBattleComplete?.Invoke(response.result);

            if (response.result.loot != null && response.result.loot.Count > 0)
            {
                await LootManager.Instance.ClaimLoot(response.lootToken, response.result.loot);
            }
        }
    }
}
