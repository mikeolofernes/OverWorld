using System;
using System.Threading.Tasks;
using UnityEngine;
// Requires the Google Sign-In Unity Plugin (see manifest.json _NOTES).
// On Android this opens the native Account Chooser; on iOS it uses
// ASWebAuthenticationSession — neither path is an embedded WebView, so
// Google's "Use secure browsers" / disallowed_useragent restriction never
// triggers.
using Google;

namespace Overworld.Auth
{
    public class GoogleSignInManager : MonoBehaviour
    {
        public static GoogleSignInManager Instance { get; private set; }

        // Paste the Web client ID from the Firebase console →
        // Authentication → Sign-in method → Google → Web client ID.
        [SerializeField] private string webClientId = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            GoogleSignIn.Configuration = new GoogleSignInConfiguration
            {
                WebClientId = webClientId,
                RequestIdToken = true,
                UseGameSignIn = false,
            };
        }

        /// <summary>
        /// Opens the native Google Sign-In UI and returns the Google ID token.
        /// Throws on cancellation or failure.
        /// </summary>
        public Task<string> GetIdTokenAsync()
        {
            var tcs = new TaskCompletionSource<string>();

            GoogleSignIn.DefaultInstance.SignIn().ContinueWith(task =>
            {
                if (task.IsCanceled)
                {
                    tcs.SetCanceled();
                    return;
                }
                if (task.IsFaulted)
                {
                    tcs.SetException(task.Exception ?? new Exception("Google Sign-In faulted"));
                    return;
                }
                tcs.SetResult(task.Result.IdToken);
            });

            return tcs.Task;
        }

        public void SignOut() => GoogleSignIn.DefaultInstance.SignOut();
    }
}
