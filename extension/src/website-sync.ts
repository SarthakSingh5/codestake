// This script runs silently on the CodeStake website.
// It listens for the window.postMessage from the Next.js React app.

window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data && event.data.type === "CODESTAKE_AUTH_SYNC" && event.data.userId) {
    console.log("CodeStake Extension: Intercepted Auth Sync! Forwarding to background...");
    
    // Forward the user ID to the background script to save it
    chrome.runtime.sendMessage({ action: 'sync_auth', userId: event.data.userId });
  }
});
