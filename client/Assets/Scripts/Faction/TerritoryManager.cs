using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using Overworld.Network;

namespace Overworld.Faction
{
    public class TerritoryManager : MonoBehaviour
    {
        public static TerritoryManager Instance { get; private set; }

        public event Action<List<HexRecord>> OnTerritoriesUpdated;

        private List<HexRecord> _territories = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public async Task LoadNearbyTerritories(double lat, double lng)
        {
            var response = await NakamaManager.Instance.GetNearbyTerritoriesAsync(lat, lng);
            if (response?.territories != null)
            {
                _territories = response.territories;
                OnTerritoriesUpdated?.Invoke(_territories);
            }
        }

        public void OnTerritoryUpdated(HexRecord updated)
        {
            int idx = _territories.FindIndex(t => t.hexIndex == updated.hexIndex);
            if (idx >= 0) _territories[idx] = updated;
            else _territories.Add(updated);
            OnTerritoriesUpdated?.Invoke(_territories);
        }

        public async Task<CaptureResponse> CaptureZone(string hexIndex, double lat, double lng, float accuracy)
        {
            var req = new CaptureRequest
            {
                hexIndex = hexIndex,
                lat = lat,
                lng = lng,
                accuracy = accuracy,
                timestampMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };
            return await NakamaManager.Instance.SendCaptureAsync(req);
        }

        public IReadOnlyList<HexRecord> GetTerritories() => _territories;
    }
}
