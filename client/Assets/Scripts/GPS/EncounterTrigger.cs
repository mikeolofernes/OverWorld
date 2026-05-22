using System;
using UnityEngine;

namespace Overworld.GPS
{
    public class EncounterTrigger : MonoBehaviour
    {
        public static EncounterTrigger Instance { get; private set; }
        public event Action<GPSSample> OnEncounterReady;

        private GPSSample _lastSample;
        private float _accumulatedDistanceM;
        private float _nextThresholdM;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            _nextThresholdM = UnityEngine.Random.Range(100f, 500f);
        }

        private void OnEnable() => GPSManager.Instance.OnValidLocationUpdate += HandleLocationUpdate;
        private void OnDisable() => GPSManager.Instance.OnValidLocationUpdate -= HandleLocationUpdate;

        public void SetThresholdFromServer(float threshold) => _nextThresholdM = threshold;

        public void UpdateAccumulated(float distanceAccumulated, float nextThreshold)
        {
            _accumulatedDistanceM = distanceAccumulated;
            _nextThresholdM = nextThreshold;
        }

        private void HandleLocationUpdate(GPSSample sample)
        {
            if (_lastSample == null)
            {
                _lastSample = sample;
                return;
            }

            double delta = GPSValidator.HaversineMeters(
                _lastSample.latitude, _lastSample.longitude,
                sample.latitude, sample.longitude);

            _accumulatedDistanceM += (float)delta;
            _lastSample = sample;

            if (_accumulatedDistanceM >= _nextThresholdM)
            {
                _accumulatedDistanceM = 0f;
                _nextThresholdM = UnityEngine.Random.Range(100f, 500f);
                OnEncounterReady?.Invoke(sample);
            }
        }

        public float GetAccumulatedDistance() => _accumulatedDistanceM;
        public float GetNextThreshold() => _nextThresholdM;
    }
}
