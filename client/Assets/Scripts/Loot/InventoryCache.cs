using System;
using System.Collections.Generic;
using UnityEngine;
using Overworld.Network;

namespace Overworld.Loot
{
    public class InventoryCache : MonoBehaviour
    {
        public static InventoryCache Instance { get; private set; }

        public event Action OnInventoryChanged;

        private Dictionary<string, InventorySlot> _slots = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void LoadFromServer(Dictionary<string, InventorySlot> serverSlots)
        {
            _slots = serverSlots ?? new Dictionary<string, InventorySlot>();
            OnInventoryChanged?.Invoke();
        }

        public void AddItems(List<LootItem> items)
        {
            foreach (var item in items)
            {
                if (_slots.TryGetValue(item.itemId, out var slot))
                    slot.quantity += item.quantity;
                else
                    _slots[item.itemId] = new InventorySlot { itemId = item.itemId, itemType = item.itemType, quantity = item.quantity, tier = item.tier, bpValue = item.bpValue };
            }
            OnInventoryChanged?.Invoke();
        }

        public IReadOnlyDictionary<string, InventorySlot> GetSlots() => _slots;
    }
}
