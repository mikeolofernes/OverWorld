#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Overworld.GPS;

namespace Overworld.GPS
{
    /// <summary>
    /// Replays a recorded GPS track in the Unity Editor for offline development.
    /// Attach to the same GameObject as GPSManager and enable in Play Mode.
    /// </summary>
    public class TestGPSFeed : MonoBehaviour
    {
        [SerializeField] private float stepIntervalSeconds = 5f;
        [SerializeField] private bool loopTrack = true;

        private static readonly List<(double lat, double lng)> SampleTrack = new()
        {
            (51.500000, -0.100000),
            (51.500100, -0.099800),
            (51.500200, -0.099600),
            (51.500350, -0.099400),
            (51.500500, -0.099200),
            (51.500700, -0.099000),
            (51.500900, -0.098800),
            (51.501100, -0.098600),
            (51.501300, -0.098400),
            (51.501500, -0.098200),
        };

        private GPSManager _gpsManager;

        private void Start()
        {
            _gpsManager = GetComponent<GPSManager>();
            if (_gpsManager == null)
            {
                Debug.LogError("[TestGPSFeed] Requires GPSManager on same GameObject.");
                return;
            }
            StartCoroutine(FeedLoop());
        }

        private IEnumerator FeedLoop()
        {
            do
            {
                for (int i = 0; i < SampleTrack.Count; i++)
                {
                    var (lat, lng) = SampleTrack[i];
                    long ts = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    var sample = new GPSSample(lat, lng, 8f, ts, false);
                    sample.validationStatus = GPS.ValidationStatus.Valid;

                    // Inject directly into GPSManager's event
                    _gpsManager.SendMessage("ProcessTestSample", sample, SendMessageOptions.DontRequireReceiver);

                    yield return new WaitForSeconds(stepIntervalSeconds);
                }
            } while (loopTrack);
        }
    }
}
#endif
