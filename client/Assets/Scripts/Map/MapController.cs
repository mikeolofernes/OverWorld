using UnityEngine;
using Mapbox.Unity.Map;
using Mapbox.Utils;
using Overworld.GPS;
using Overworld.Faction;

namespace Overworld.Map
{
    [RequireComponent(typeof(AbstractMap))]
    public class MapController : MonoBehaviour
    {
        [SerializeField] private float defaultZoom = 15f;

        private AbstractMap _map;

        private void Awake() => _map = GetComponent<AbstractMap>();

        private void Start()
        {
            _map.Initialize(Vector2d.zero, (int)defaultZoom);
            GPSManager.Instance.OnValidLocationUpdate += CenterOnPlayer;
        }

        private void OnDestroy()
        {
            if (GPSManager.Instance != null)
                GPSManager.Instance.OnValidLocationUpdate -= CenterOnPlayer;
        }

        private void CenterOnPlayer(GPSSample sample)
        {
            _map.UpdateMap(new Vector2d(sample.latitude, sample.longitude), _map.Zoom);
        }

        public AbstractMap GetMap() => _map;
    }
}
