using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;

namespace Overworld.UI
{
    public class ToastNotification : MonoBehaviour
    {
        public static ToastNotification Instance { get; private set; }

        [SerializeField] private GameObject toastPrefab;
        [SerializeField] private Transform toastContainer;
        [SerializeField] private float displayDuration = 2.5f;

        private readonly Queue<string> _queue = new();
        private bool _showing;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Show(string message)
        {
            _queue.Enqueue(message);
            if (!_showing) StartCoroutine(ShowNext());
        }

        private IEnumerator ShowNext()
        {
            _showing = true;
            while (_queue.Count > 0)
            {
                string msg = _queue.Dequeue();
                var go = Instantiate(toastPrefab, toastContainer);
                go.GetComponentInChildren<TextMeshProUGUI>().text = msg;
                yield return new WaitForSeconds(displayDuration);
                Destroy(go);
            }
            _showing = false;
        }
    }
}
