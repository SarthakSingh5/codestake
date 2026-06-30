// This is the background service worker.
// It handles listening to messages from the content script (LeetCode) and securely forwarding them to our Next.js API.

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle_ui' }).catch(err => {
      console.log("Could not send message to tab. Is the content script running?", err);
    });
  }
});

// Listen for secure handshake from CodeStake website via our injected content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // Pass the UI toggle message to the active tab
  if (request.action === 'toggle_ui') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle_ui' });
      }
    });
  }

  // Handle Auth Sync from website-sync.ts
  if (request.action === 'sync_auth') {
    chrome.storage.local.set({ userId: request.userId }, () => {
      console.log('CodeStake Background: Saved user ID:', request.userId);
    });
  }

  // Memory Wipe Trap: Securely set the session in in-memory storage (cleared if extension disabled)
  if (request.action === 'mark_session_active') {
    chrome.storage.session.set({ [`cs_session_${request.sessionId}`]: true }, () => {
      console.log(`CodeStake Background: Memory Wipe Trap armed for session ${request.sessionId}`);
      sendResponse({ success: true });
    });
    return true;
  }

  // Memory Wipe Trap: Check if the session is still in memory
  if (request.action === 'check_memory_wipe') {
    chrome.storage.session.get([`cs_session_${request.sessionId}`], (result) => {
      const isIntact = result[`cs_session_${request.sessionId}`] === true;
      console.log(`CodeStake Background: Memory Wipe Check for ${request.sessionId}: Intact? ${isIntact}`);
      sendResponse({ wiped: !isIntact });
    });
    return true;
  }

  // Proxy API requests to bypass Private Network Access (PNA) blocks on leetcode.com
  if (request.action === 'fetch_api') {
    fetch(request.url, request.options)
      .then(async (res) => {
        const data = await res.json();
        sendResponse({ ok: res.ok, status: res.status, data });
      })
      .catch((err) => {
        console.error("CodeStake Background Fetch Error:", err);
        sendResponse({ error: err.message || "Network Error" });
      });
    return true; // Keep the message channel open for async response
  }
});
