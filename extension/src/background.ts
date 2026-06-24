// This is the background service worker.
// It handles listening to messages from the content script (LeetCode) and securely forwarding them to our Next.js API.

chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (request.action === 'resolve_stake') {
    // Here we would securely ping https://codestake-zeta.vercel.app/api/extension/stake
    // to refund the money or seize it.
    console.log("Resolving stake:", request.status, "from sender:", sender.id);
    sendResponse({ success: true });
  }
});
