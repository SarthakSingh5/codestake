// Interceptor script injected directly into the LeetCode DOM
// It hooks into `window.fetch` to listen for submission results without relying on DOM elements.

const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);

  // Clone the response so we don't consume the stream
  const clone = response.clone();

  try {
    let url = '';
    if (typeof args[0] === 'string') {
      url = args[0];
    } else if (args[0] && typeof args[0].url === 'string') {
      url = args[0].url; // Request object
    } else if (args[0] && typeof args[0].href === 'string') {
      url = args[0].href; // URL object
    }

    // LeetCode's submission check API: https://leetcode.com/submissions/detail/{id}/check/
    if (url && url.includes('/submissions/detail/') && url.includes('/check/')) {
      const data = await clone.json();

      // state is "PENDING" or "STARTED" while running, then "SUCCESS" when finished
      if (data.state === "SUCCESS") {
        // e.g., "Accepted", "Wrong Answer", "Runtime Error", "Time Limit Exceeded"
        const verdict = data.status_msg;

        // Broadcast the result securely to our Content Script
        window.postMessage({
          type: 'CODESTAKE_SUBMISSION_RESULT',
          verdict: verdict
        }, '*');
      }
    }
  } catch (err) {
    // Silently fail if JSON parsing fails or something goes wrong,
    // we don't want to break the user's LeetCode experience.
    console.error("[CodeStake Interceptor] Error:", err);
  }

  return response;
};

console.log("[CodeStake] Network Interceptor activated. Ready to track submissions securely.");
