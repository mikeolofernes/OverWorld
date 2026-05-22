using System;
using System.Threading.Tasks;
using UnityEngine;
using Overworld.Network;

namespace Overworld.Faction
{
    public enum FactionType { None, Veil, Surge, NullFaction }

    public class FactionManager : MonoBehaviour
    {
        public static FactionManager Instance { get; private set; }

        public event Action<FactionType> OnFactionChanged;

        public FactionType CurrentFaction { get; private set; } = FactionType.None;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void SetFaction(string factionString)
        {
            CurrentFaction = factionString switch
            {
                "veil"         => FactionType.Veil,
                "surge"        => FactionType.Surge,
                "null_faction" => FactionType.NullFaction,
                _              => FactionType.None,
            };
            OnFactionChanged?.Invoke(CurrentFaction);
        }

        public async Task<bool> JoinFaction(FactionType faction)
        {
            string factionKey = faction switch
            {
                FactionType.Veil        => "veil",
                FactionType.Surge       => "surge",
                FactionType.NullFaction => "null_faction",
                _ => throw new ArgumentException("Invalid faction"),
            };

            var response = await NakamaManager.Instance.JoinFactionAsync(factionKey);
            if (response.success) SetFaction(factionKey);
            return response.success;
        }

        public Color GetFactionColor()
        {
            return CurrentFaction switch
            {
                FactionType.Veil        => new Color(0.4f, 0.2f, 0.8f),
                FactionType.Surge       => new Color(0.9f, 0.5f, 0.1f),
                FactionType.NullFaction => new Color(0.3f, 0.8f, 0.5f),
                _                       => Color.gray,
            };
        }
    }
}
