"use client";

import Editor from "@monaco-editor/react";

// ── Props ────────────────────────────────────────────────────────────────────
type CodeEditorProps = {
  language: string;       // e.g. "python", "javascript", "cpp"
  value: string;          // the current code
  onChange: (value: string) => void;  // called on every keystroke
  disableClipboard?: boolean; // Anti-cheat flag to block copy/paste
};

// ── Component ────────────────────────────────────────────────────────────────
export default function CodeEditor({ language, value, onChange, disableClipboard = false }: CodeEditorProps) {
  // Capture clipboard events to brutally prevent copy/paste when disabled
  const handleClipboardEvent = (e: React.ClipboardEvent | React.KeyboardEvent) => {
    if (disableClipboard) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div 
      className="h-full w-full"
      onCopyCapture={handleClipboardEvent}
      onPasteCapture={handleClipboardEvent}
      onCutCapture={handleClipboardEvent}
      onKeyDownCapture={(e) => {
        // Specifically block keyboard shortcuts for Ctrl/Cmd + C, X, V
        if (disableClipboard && (e.ctrlKey || e.metaKey)) {
          const key = e.key.toLowerCase();
          if (key === 'c' || key === 'v' || key === 'x') {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }}
    >
      <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val ?? "")}
      options={{
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), monospace",
        minimap: { enabled: false },         // hide the mini preview on the right
        scrollBeyondLastLine: false,         // don't scroll past the last line
        padding: { top: 16, bottom: 16 },   // breathing room
        lineNumbersMinChars: 3,             // compact line numbers
        renderLineHighlight: "gutter",      // subtle current-line highlight
        bracketPairColorization: { enabled: true },  // colored brackets
        automaticLayout: true,              // auto-resize when container changes
        contextmenu: !disableClipboard,     // disable right-click menu if anti-cheat is active
      }}
      loading={
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Loading editor…
        </div>
      }
    />
    </div>
  );
}
