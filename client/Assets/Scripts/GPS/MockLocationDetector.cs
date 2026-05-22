using UnityEngine;

namespace Overworld.GPS
{
    public static class MockLocationDetector
    {
        public static bool IsMockLocation()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            return CheckAndroidMockLocation();
#elif UNITY_IOS && !UNITY_EDITOR
            return CheckIOSJailbreak();
#else
            return false;
#endif
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        private static bool CheckAndroidMockLocation()
        {
            try
            {
                using var locationManager = new AndroidJavaObject("android.location.LocationManager");
                // The mock provider flag is in the Location object returned from GPS provider
                // We use the SecuritySettings check as a proxy
                using var context = new AndroidJavaClass("com.unity3d.player.UnityPlayer")
                    .GetStatic<AndroidJavaObject>("currentActivity");
                using var settings = new AndroidJavaClass("android.provider.Settings$Secure");
                int mockValue = settings.CallStatic<int>("getInt",
                    context.Call<AndroidJavaObject>("getContentResolver"),
                    "mock_location", 0);
                return mockValue == 1;
            }
            catch
            {
                return false;
            }
        }
#endif

#if UNITY_IOS && !UNITY_EDITOR
        private static bool CheckIOSJailbreak()
        {
            string[] jailbreakPaths = { "/bin/bash", "/usr/sbin/sshd", "/etc/apt", "/private/var/lib/apt/" };
            foreach (var path in jailbreakPaths)
            {
                if (System.IO.File.Exists(path)) return true;
            }
            return false;
        }
#endif
    }
}
