using System;
using System.Threading.Tasks;
using UnityEngine;
using Overworld.Network;
using Overworld.Faction;
using Overworld.Loot;

namespace Overworld.Player
{
    public class PlayerStateManager : MonoBehaviour
    {
        public static PlayerStateManager Instance { get; private set; }

        public event Action<PlayerProfile> OnProfileLoaded;
        public event Action<int> OnBPChanged;

        public PlayerProfile Profile { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public async Task LoadPlayerState()
        {
            var state = await NakamaManager.Instance.GetPlayerStateAsync();
            Profile = state.profile;
            InventoryCache.Instance.LoadFromServer(state.inventory);
            FactionManager.Instance.SetFaction(state.profile.faction ?? "");
            OnProfileLoaded?.Invoke(Profile);
        }

        public void UpdateBP(int newBP)
        {
            if (Profile != null) Profile.bp = newBP;
            OnBPChanged?.Invoke(newBP);
        }
    }
}
