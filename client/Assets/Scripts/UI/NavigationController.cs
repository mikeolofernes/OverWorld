using System.Collections.Generic;
using UnityEngine;

namespace Overworld.UI
{
    public class NavigationController : MonoBehaviour
    {
        [SerializeField] private List<GameObject> screens;
        [SerializeField] private int defaultScreenIndex = 0;

        private int _currentIndex = -1;

        private void Start() => ShowScreen(defaultScreenIndex);

        public void ShowScreen(int index)
        {
            if (index < 0 || index >= screens.Count) return;
            if (_currentIndex >= 0) screens[_currentIndex].SetActive(false);
            _currentIndex = index;
            screens[_currentIndex].SetActive(true);
        }

        public void ShowMap()      => ShowScreen(0);
        public void ShowInventory() => ShowScreen(1);
        public void ShowJournal()  => ShowScreen(2);
        public void ShowFaction()  => ShowScreen(3);
        public void ShowProfile()  => ShowScreen(4);
    }
}
