using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Overworld.Battle;
using Overworld.Network;

namespace Overworld.UI
{
    public class BattleScreenUI : MonoBehaviour
    {
        [SerializeField] private GameObject battlePanel;
        [SerializeField] private TextMeshProUGUI outcomeLabel;
        [SerializeField] private TextMeshProUGUI xpLabel;
        [SerializeField] private TextMeshProUGUI lootLabel;
        [SerializeField] private Slider playerBPBar;
        [SerializeField] private Slider echoBPBar;
        [SerializeField] private float displayDurationSeconds = 3f;

        private void OnEnable() => BattleOrchestrator.Instance.OnBattleComplete += ShowResult;
        private void OnDisable() => BattleOrchestrator.Instance.OnBattleComplete -= ShowResult;

        private void ShowResult(BattleResult result)
        {
            battlePanel.SetActive(true);
            outcomeLabel.text = result.outcome == "win" ? "VICTORY" : "DEFEAT";
            xpLabel.text = $"+{result.xpGained} XP";

            var lootSummary = result.loot?.Count > 0 ? $"Loot: {result.loot.Count} item(s)" : "";
            lootLabel.text = lootSummary;

            StartCoroutine(HideAfterDelay());
        }

        private IEnumerator HideAfterDelay()
        {
            yield return new WaitForSeconds(displayDurationSeconds);
            battlePanel.SetActive(false);
        }
    }
}
