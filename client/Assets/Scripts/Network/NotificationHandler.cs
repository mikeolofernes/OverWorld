using System;
using UnityEngine;
using Nakama;
using Newtonsoft.Json;
using Overworld.Faction;
using Overworld.Player;

namespace Overworld.Network
{
    public class NotificationHandler : MonoBehaviour
    {
        public static NotificationHandler Instance { get; private set; }

        private const int NotifTerritoryUpdate = 100;
        private const int NotifFactionWar      = 101;
        private const int NotifMissionComplete = 103;
        private const int NotifLootReceived    = 104;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Handle(IApiNotification notification)
        {
            switch (notification.Code)
            {
                case NotifTerritoryUpdate:
                    var territoryData = JsonConvert.DeserializeObject<HexRecord>(notification.Content);
                    TerritoryManager.Instance?.OnTerritoryUpdated(territoryData);
                    break;

                case NotifFactionWar:
                    FactionWarMonitor.Instance?.OnWarUpdate(notification.Content);
                    break;

                case NotifMissionComplete:
                    ToastNotification.Instance?.Show("Mission Complete!");
                    break;

                case NotifLootReceived:
                    ToastNotification.Instance?.Show("Loot received!");
                    break;
            }
        }
    }
}
