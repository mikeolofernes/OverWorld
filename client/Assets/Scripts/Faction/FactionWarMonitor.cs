using System;
using UnityEngine;
using Newtonsoft.Json;

namespace Overworld.Faction
{
    public class FactionWarMonitor : MonoBehaviour
    {
        public static FactionWarMonitor Instance { get; private set; }

        public event Action<string, int> OnWarScoreUpdated;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void OnWarUpdate(string content)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<dynamic>(content);
                string faction = (string)data.faction;
                int score = (int)data.score;
                OnWarScoreUpdated?.Invoke(faction, score);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[FactionWarMonitor] Failed to parse war update: {e.Message}");
            }
        }
    }
}
