using System;
using System.Collections.Generic;
using UnityEngine;
using Overworld.GPS;
using Overworld.Network;

namespace Overworld.Echo
{
    public class EchoManager : MonoBehaviour
    {
        public static EchoManager Instance { get; private set; }

        public event Action<ActiveEcho> OnEchoSpawned;
        public event Action<string> OnEchoExpired;

        private readonly Dictionary<string, ActiveEcho> _activeEchoes = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private async void OnEnable()
        {
            EncounterTrigger.Instance.OnEncounterReady += HandleEncounterReady;
        }

        private void OnDisable()
        {
            EncounterTrigger.Instance.OnEncounterReady -= HandleEncounterReady;
        }

        private async void HandleEncounterReady(GPSSample location)
        {
            var request = new EncounterRequest
            {
                lat = location.latitude,
                lng = location.longitude,
                accuracy = location.accuracy,
                timestampMs = location.timestampMs,
                mockFlag = location.isMockLocation,
            };

            try
            {
                var response = await NakamaManager.Instance.SendEncounterRequestAsync(request);

                EncounterTrigger.Instance.UpdateAccumulated(response.distanceAccumulated, response.nextThresholdM);

                if (response.triggered && response.echo != null)
                {
                    var echo = ActiveEcho.FromSpawnData(response.echo);
                    _activeEchoes[echo.echoId] = echo;
                    OnEchoSpawned?.Invoke(echo);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[EchoManager] Encounter request failed: {e.Message}");
            }
        }

        public void RemoveEcho(string echoId)
        {
            _activeEchoes.Remove(echoId);
            OnEchoExpired?.Invoke(echoId);
        }

        public IEnumerable<ActiveEcho> GetActiveEchoes() => _activeEchoes.Values;
    }
}
