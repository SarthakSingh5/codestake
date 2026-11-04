// Interceptor script injected directly into the LeetCode DOM
// It hooks into `window.fetch` to listen for submission results without relying on DOM elements.

const originalFetch = window.fetch;
const validSubmitIds = new Set();

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

    // 1. Capture the submission_id from actual Submits (ignoring 'Run Code' which goes to /interpret_solution/)
    if (url && url.includes('/submit/')) {
      try {
        const data = await clone.json();
        if (data && data.submission_id) {
          validSubmitIds.add(data.submission_id.toString());
          console.log("[CodeStake] Captured Submit ID:", data.submission_id);
        }
      } catch (e) {
        // Silently ignore non-JSON /submit/ endpoints
      }
    }

    // 2. Poll for the result of the submission
    if (url && url.includes('/submissions/detail/') && url.includes('/check/')) {
      const match = url.match(/\/submissions\/detail\/(\d+)\/check/);
      const submissionId = match ? match[1].toString() : null;

      const data = await clone.json();

      // state is "PENDING" or "STARTED" while running, then "SUCCESS" when finished
      if (data.state === "SUCCESS") {
        const taskName = (data.task_name || '').toLowerCase();

        // A "Run" uses task_name like "judger.runcode..." or contains "test" or "interpret"
        // A "Submit" uses task_name like "judger.judgetask..." or contains "submit"
        const isRunTask = taskName.includes('runcode') || taskName.includes('.test.') || taskName.includes('test') || taskName.includes('interpret');
        const isSubmitTask = taskName.includes('judgetask') || taskName.includes('.submit.') || taskName.includes('submit');
        const isMatchedId = submissionId ? validSubmitIds.has(submissionId) : false;

        console.log('[CodeStake] /check/ SUCCESS — task_name:', data.task_name, '| submissionId:', submissionId, '| validSubmitIds:', [...validSubmitIds], '| isMatchedId:', isMatchedId, '| isRunTask:', isRunTask, '| isSubmitTask:', isSubmitTask, '| status_msg:', data.status_msg);

        // Strict verification: MUST be a real submit, NEVER a run/interpret task
        if (!isRunTask && (isMatchedId || isSubmitTask)) {
          if (submissionId) validSubmitIds.delete(submissionId); // clean up memory

          // e.g., "Accepted", "Wrong Answer", "Runtime Error", "Time Limit Exceeded"
          const verdict = data.status_msg;

          console.log('[CodeStake] Firing verdict postMessage for REAL submit:', verdict);

          const currentSlug = window.location.pathname.startsWith('/problems/') ? window.location.pathname.split('/')[2] : null;

          // Broadcast the result securely to our Content Script
          window.postMessage({
            type: 'CODESTAKE_SUBMISSION_RESULT',
            verdict: verdict,
            problemSlug: currentSlug
          }, '*');
        } else {
          console.log('[CodeStake] Ignored Run Code /check/ result.');
        }
      }
    }
  } catch (err) {
    // Silently fail if JSON parsing fails or something goes wrong,
    // we don't want to break the user's LeetCode experience.
    console.error("[CodeStake Interceptor] Error:", err);
  }

  return response;
};

let isResettingBoilerplate = false;
let isAntiCheatActiveInPage = false;

// ── LAYER 2: OVERRIDE BROWSER CLIPBOARD API ─────────────────────────────────
// When Anti-Cheat is active, reading the clipboard returns empty string
if (navigator.clipboard) {
  const origReadText = navigator.clipboard.readText ? navigator.clipboard.readText.bind(navigator.clipboard) : null;
  const origRead = navigator.clipboard.read ? navigator.clipboard.read.bind(navigator.clipboard) : null;

  navigator.clipboard.readText = async function () {
    if (isAntiCheatActiveInPage) {
      console.warn('[CodeStake] Blocked navigator.clipboard.readText() call.');
      return '';
    }
    return origReadText ? origReadText() : '';
  };

  if (origRead) {
    navigator.clipboard.read = async function () {
      if (isAntiCheatActiveInPage) {
        console.warn('[CodeStake] Blocked navigator.clipboard.read() call.');
        return [];
      }
      return origRead();
    };
  }
}

// ── LAYER 3: MONACO EDITOR NATIVE KEYGUARD ──────────────────────────────────
// Intercepts Monaco's internal onKeyDown so Ctrl+V / Cmd+V never executes
function attachMonacoGuards() {
  if (!window.monaco || !window.monaco.editor) {
    setTimeout(attachMonacoGuards, 400);
    return;
  }

  const guardEditor = (editor) => {
    if (!editor || editor.__codestake_guarded) return;
    editor.__codestake_guarded = true;

    if (editor.onKeyDown) {
      editor.onKeyDown((e) => {
        if (!isAntiCheatActiveInPage) return;

        if (e.ctrlKey || e.metaKey) {
          // In monaco.KeyCode: KeyV is 52, KeyC is 33, KeyX is 54
          const KeyV = window.monaco.KeyCode ? window.monaco.KeyCode.KeyV : 52;
          const KeyC = window.monaco.KeyCode ? window.monaco.KeyCode.KeyC : 33;
          const KeyX = window.monaco.KeyCode ? window.monaco.KeyCode.KeyX : 54;

          if (e.keyCode === KeyV || e.keyCode === KeyC || e.keyCode === KeyX) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('[CodeStake] Blocked Monaco native keydown for KeyCode:', e.keyCode);
            window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
              detail: {
                type: 'warning',
                title: '🚨 ANTI-CHEAT ACTIVE',
                text: 'Keyboard shortcuts for Copy/Paste are forbidden during active challenges!'
              }
            }));
          }
        }
      });
    }
  };

  if (window.monaco.editor.onDidCreateEditor) {
    window.monaco.editor.onDidCreateEditor((ed) => guardEditor(ed));
  }

  if (window.monaco.editor.getEditors) {
    window.monaco.editor.getEditors().forEach((ed) => guardEditor(ed));
  }
}

attachMonacoGuards();

async function resetMonacoBoilerplate(targetSlug, attempt = 0) {
  const isProblemPage = window.location.pathname.startsWith('/problems/');
  const currentSlug = targetSlug || (isProblemPage ? window.location.pathname.split('/')[2] : null);

  if (!currentSlug) return;

  // 1. Wait for Monaco Editor & Models to initialize
  if (!window.monaco || !window.monaco.editor || window.monaco.editor.getModels().length === 0) {
    if (attempt < 25) {
      setTimeout(() => resetMonacoBoilerplate(currentSlug, attempt + 1), 400);
    }
    return;
  }

  const models = window.monaco.editor.getModels();
  const mainModel = models.find(m => m.uri && m.uri.toString().includes("main")) || models[0];

  if (!mainModel) return;

  const langId = mainModel.getLanguageId(); // e.g. "python", "cpp", "java", "javascript"

  try {
    isResettingBoilerplate = true;
    console.log(`[CodeStake] Fetching official boilerplate for ${currentSlug} in ${langId}...`);

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

    const response = await originalFetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        variables: { titleSlug: currentSlug }
      })
    });

    const json = await response.json();
    const snippets = json?.data?.question?.codeSnippets || [];

    const matchedSnippet = snippets.find(s =>
      s.langSlug === langId ||
      s.lang.toLowerCase() === langId ||
      (langId.includes('python') && s.langSlug.includes('python'))
    );

    const boilerplate = matchedSnippet ? matchedSnippet.code : '// Code reset by CodeStake Anti-Cheat.';

    // Set clean boilerplate
    mainModel.setValue(boilerplate);
    console.log("[CodeStake] Editor reset to official boilerplate via GraphQL.");

    // LeetCode Draft Restore Shield:
    // LeetCode's client often asynchronously restores old code drafts ~500-1500ms after Monaco mounts.
    // If LeetCode overrides our clean boilerplate with a previously saved solution, re-apply boilerplate!
    let draftsBlocked = 0;
    const disposable = mainModel.onDidChangeContent(() => {
      if (isResettingBoilerplate) return;
      const currentVal = mainModel.getValue();
      // If code changed abruptly to something much longer than boilerplate (draft auto-restore)
      if (draftsBlocked < 2 && currentVal && currentVal !== boilerplate && currentVal.length > boilerplate.length + 30) {
        draftsBlocked++;
        console.warn("[CodeStake] Blocked LeetCode auto-draft restore. Enforcing clean boilerplate.");
        mainModel.setValue(boilerplate);
      }
    });

    setTimeout(() => {
      isResettingBoilerplate = false;
      disposable.dispose();
    }, 3000);

  } catch (e) {
    isResettingBoilerplate = false;
    console.error("[CodeStake] Failed to fetch boilerplate:", e);
  }
}

window.addEventListener('message', async (event) => {
  if (event.data) {
    if (event.data.type === 'CODESTAKE_SET_ANTICHEAT') {
      isAntiCheatActiveInPage = Boolean(event.data.enabled);
      console.log('[CodeStake Interceptor] Anti-Cheat state synced:', isAntiCheatActiveInPage);
    } else if (event.data.type === 'CODESTAKE_CLEAR_EDITOR' || event.data.type === 'CODESTAKE_ENFORCE_BOILERPLATE') {
      resetMonacoBoilerplate(event.data.problemSlug);
    }
  }
});

console.log("[CodeStake] Network Interceptor activated. Ready to track submissions securely.");
