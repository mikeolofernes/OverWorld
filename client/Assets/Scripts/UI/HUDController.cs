using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Overworld.Player;
using Overworld.GPS;
using Overworld.Faction;

namespace Overworld.UI
{
    public class HUDController : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI bpLabel;
        [SerializeField] private TextMeshProUGUI distanceLabel;
        [SerializeField] private Image factionColorStrip;
        [SerializeField] private Slider encounterProgressBar;

        private void OnEnable()
        {
            PlayerStateManager.Instance.OnBPChanged += UpdateBP;
            FactionManager.Instance.OnFactionChanged += UpdateFactionColor;
        }

        private void OnDisable()
        {
            PlayerStateManager.Instance.OnBPChanged -= UpdateBP;
            FactionManager.Instance.OnFactionChanged -= UpdateFactionColor;
        }

        private void Update()
        {
            if (EncounterTrigger.Instance != null && encounterProgressBar != null)
            {
                float t = EncounterTrigger.Instance.GetAccumulatedDistance() /
                          Mathf.Max(1f, EncounterTrigger.Instance.GetNextThreshold());
                encounterProgressBar.value = Mathf.Clamp01(t);
            }
        }

        private void UpdateBP(int newBP)
        {
            if (bpLabel != null) bpLabel.text = $"BP {newBP}";
        }

        private void UpdateFactionColor(FactionType faction)
        {
            if (factionColorStrip != null)
                factionColorStrip.color = FactionManager.Instance.GetFactionColor();
        }
    }
}
