using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using Overworld.Network;

namespace Overworld.Loot
{
    public class LootManager : MonoBehaviour
    {
        public static LootManager Instance { get; private set; }

        public event Action<List<LootItem>> OnLootReceived;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public async Task ClaimLoot(string lootToken, List<LootItem> items)
        {
            string battleId = Guid.NewGuid().ToString();
            long ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            var req = new LootClaimRequest { lootToken = lootToken, battleId = battleId, timestamp = ts, items = items };
            var response = await NakamaManager.Instance.SendLootClaimAsync(req);

            if (response.success)
            {
                InventoryCache.Instance.AddItems(items);
                OnLootReceived?.Invoke(items);
            }
        }
    }
}
