using UnityEngine;
using Mapbox.Unity.Map;
using Mapbox.Utils;
using Overworld.GPS;

namespace Overworld.Map
{
    public class PlayerMarker : MonoBehaviour
    {
        [SerializeField] private GameObject markerPrefab;

        private AbstractMap _map;
        private GameObject _marker;

        private void Start()
        {
            _map = FindObjectOfType<AbstractMap>();
            _marker = Instantiate(markerPrefab);
            GPSManager.Instance.OnValidLocationUpdate += UpdateMarker;
        }

        private void OnDestroy()
        {
            if (GPSManager.Instance != null)
                GPSManager.Instance.OnValidLocationUpdate -= UpdateMarker;
        }

        private void UpdateMarker(GPSSample sample)
        {
            if (_map == null || _marker == null) return;
            Vector3 worldPos = _map.GeoToWorldPosition(new Vector2d(sample.latitude, sample.longitude), false);
            _marker.transform.position = new Vector3(worldPos.x, worldPos.y + 0.1f, worldPos.z);
        }
    }
}
