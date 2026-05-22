using System.Collections.Generic;
using UnityEngine;
using Mapbox.Unity.Map;
using Mapbox.Utils;
using Overworld.Faction;
using Overworld.Network;

namespace Overworld.Map
{
    public class TerritoryRenderer : MonoBehaviour
    {
        [SerializeField] private Material hexMaterial;
        [SerializeField, Range(0f, 1f)] private float hexAlpha = 0.4f;

        private readonly Dictionary<string, GameObject> _hexObjects = new();
        private AbstractMap _map;

        private void Start()
        {
            _map = GetComponentInParent<AbstractMap>() ?? FindObjectOfType<AbstractMap>();
            TerritoryManager.Instance.OnTerritoriesUpdated += RenderTerritories;
        }

        private void OnDestroy()
        {
            if (TerritoryManager.Instance != null)
                TerritoryManager.Instance.OnTerritoriesUpdated -= RenderTerritories;
        }

        private void RenderTerritories(List<HexRecord> territories)
        {
            foreach (var hex in territories)
                RenderHex(hex);
        }

        private void RenderHex(HexRecord hex)
        {
            if (_hexObjects.TryGetValue(hex.hexIndex, out var existing))
                Destroy(existing);

            if (hex.boundary == null || hex.boundary.Count < 3) return;

            var go = new GameObject($"Hex_{hex.hexIndex}");
            go.transform.SetParent(transform);

            var meshFilter = go.AddComponent<MeshFilter>();
            var meshRenderer = go.AddComponent<MeshRenderer>();
            meshRenderer.material = new Material(hexMaterial);

            Color color = GetFactionColor(hex.ownerFaction);
            color.a = hexAlpha;
            meshRenderer.material.color = color;

            var vertices = new List<Vector3>();
            foreach (var point in hex.boundary)
            {
                Vector3 worldPos = _map.GeoToWorldPosition(new Vector2d(point.lat, point.lng), false);
                vertices.Add(worldPos);
            }

            var mesh = new Mesh();
            mesh.vertices = vertices.ToArray();

            var tris = new List<int>();
            for (int i = 1; i < vertices.Count - 1; i++)
            {
                tris.Add(0); tris.Add(i); tris.Add(i + 1);
            }
            mesh.triangles = tris.ToArray();
            mesh.RecalculateNormals();
            meshFilter.mesh = mesh;

            _hexObjects[hex.hexIndex] = go;
        }

        private static Color GetFactionColor(string faction)
        {
            return faction switch
            {
                "veil"         => new Color(0.4f, 0.2f, 0.8f),
                "surge"        => new Color(0.9f, 0.5f, 0.1f),
                "null_faction" => new Color(0.3f, 0.8f, 0.5f),
                _              => Color.gray,
            };
        }
    }
}
