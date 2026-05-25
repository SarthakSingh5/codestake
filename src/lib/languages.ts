// ── Language configuration ───────────────────────────────────────────────────
// Each entry maps a language to:
//   - monacoLang: the Monaco Editor language identifier (for syntax highlighting)
//   - wandboxCompiler: the Wandbox API compiler name
//   - boilerplate: starter code shown when the user first opens the editor

export type Language = {
  id: string;
  label: string;
  monacoLang: string;
  wandboxCompiler: string;
  boilerplate: string;
};

export const LANGUAGES: Language[] = [
  {
    id: "python",
    label: "Python 3",
    monacoLang: "python",
    wandboxCompiler: "cpython-3.12.7",
    boilerplate: "import sys\n# Read input from sys.stdin.read() or input()\n# Write output to print()\n\n",
  },
  {
    id: "javascript",
    label: "JavaScript",
    monacoLang: "javascript",
    wandboxCompiler: "nodejs-20.17.0",
    boilerplate: "const fs = require('fs');\n// Read input from /dev/stdin\n// const input = fs.readFileSync('/dev/stdin', 'utf-8');\n\n",
  },
  {
    id: "cpp",
    label: "C++ 17",
    monacoLang: "cpp",
    wandboxCompiler: "gcc-13.2.0",
    boilerplate:
`#include <iostream>
using namespace std;

int main() {
    
    return 0;
}
`,
  },
  {
    id: "java",
    label: "Java",
    monacoLang: "java",
    wandboxCompiler: "openjdk-jdk-22+36",
    boilerplate:
`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
    }
}
`,
  },
  {
    id: "go",
    label: "Go",
    monacoLang: "go",
    wandboxCompiler: "go-1.23.2",
    boilerplate:
`package main

import "fmt"

func main() {
    
}
`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getLanguageById(id: string): Language | undefined {
  return LANGUAGES.find((lang) => lang.id === id);
}

export function getDefaultLanguage(): Language {
  return LANGUAGES[0]; // Python 3
}
