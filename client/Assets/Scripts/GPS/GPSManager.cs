using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Overworld.Network;

namespace Overworld.GPS
{
    public class GPSManager : MonoBehaviour
    {
        public static GPSManager Instance { get; private set; }

        public event Action<GPSSample> OnValidLocationUpdate;
        public event Action<ValidationStatus> OnLocationRejected;

        [SerializeField] private float pollIntervalSeconds = 5f;

        private GPSSample _lastValidSample;
        private readonly List<GPSSample> _history = new();
        private const int HistoryMaxSize = 20;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private IEnumerator Start()
        {
            if (!Input.location.isEnabledByUser)
            {
                Debug.LogWarning("[GPS] Location services disabled by user.");
                yield break;
            }

            Input.location.Start(5f, 5f);
            int timeout = 20;
            while (Input.location.status == LocationServiceStatus.Initializing && timeout > 0)
            {
                yield return new WaitForSeconds(1f);
                timeout--;
            }

            if (Input.location.status != LocationServiceStatus.Running)
            {
                Debug.LogError("[GPS] Failed to start location services.");
                yield break;
            }

            StartCoroutine(PollLoop());
        }

        private IEnumerator PollLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(pollIntervalSeconds);
                ProcessNewLocation(Input.location.lastData);
            }
        }

        private void ProcessNewLocation(LocationInfo info)
        {
            bool isMock = MockLocationDetector.IsMockLocation();
            long tsMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var sample = new GPSSample(info.latitude, info.longitude, info.horizontalAccuracy, tsMs, isMock);

            var status = GPSValidator.Validate(sample, _lastValidSample, _history);
            sample.validationStatus = status;

            if (status == ValidationStatus.Valid)
            {
                _lastValidSample = sample;
                _history.Add(sample);
                if (_history.Count > HistoryMaxSize) _history.RemoveAt(0);
                OnValidLocationUpdate?.Invoke(sample);
            }
            else
            {
                OnLocationRejected?.Invoke(status);
            }
        }

        public GPSSample GetLastValidSample() => _lastValidSample;

        private void OnDestroy()
        {
            Input.location.Stop();
        }
    }
}
