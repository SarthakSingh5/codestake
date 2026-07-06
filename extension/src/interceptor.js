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

window.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CODESTAKE_CLEAR_EDITOR') {
    try {
      if (!window.monaco || !window.monaco.editor) {
        console.log("[CodeStake] Monaco not found.");
        return;
      }

      const models = window.monaco.editor.getModels();
      const mainModel = models.find(m => m.uri && m.uri.toString().includes("main")) || models[0];
      
      if (!mainModel) return;

      const langId = mainModel.getLanguageId(); // e.g. "python", "cpp", "java", "javascript"
      const slug = window.location.pathname.split('/')[2];
      
      if (!slug) return;

      console.log(`[CodeStake] Fetching boilerplate for ${slug} in ${langId}...`);

      // Fetch the exact official boilerplate directly from LeetCode's GraphQL API
      const query = `
        query questionEditorData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            codeSnippets {
              lang
              langSlug
              code
            }
          }
        }
      `;
      
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          variables: { titleSlug: slug }
        })
      });
      
      const json = await response.json();
      const snippets = json?.data?.question?.codeSnippets || [];
      
      // Find the snippet that matches the current Monaco language
      const matchedSnippet = snippets.find(s => 
        s.langSlug === langId || 
        s.lang.toLowerCase() === langId ||
        (langId.includes('python') && s.langSlug.includes('python'))
      );
      
      if (matchedSnippet) {
        mainModel.setValue(matchedSnippet.code);
        console.log("[CodeStake] Editor flawlessly reset to official boilerplate via GraphQL.");
      } else {
        // Fallback if language matching fails
        mainModel.setValue('// Code wiped by CodeStake. Boilerplate not found.');
      }
    } catch (e) {
      console.error("[CodeStake] Failed to fetch boilerplate:", e);
    }
  }
});

console.log("[CodeStake] Network Interceptor activated. Ready to track submissions securely.");
