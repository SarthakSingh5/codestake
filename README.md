<p align="center">
  <h1 align="center">🎯 CodeStake</h1>
  <p align="center">
    <strong>High-Stakes Coding Arena — Bet on Yourself.</strong>
  </p>
  <p align="center">
    Stake real money on solving coding challenges.<br/>
    Solve the problem, keep your cash. Fail, and pay the price.
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#project-structure">Project Structure</a>
  </p>
</p>

---

## What is CodeStake?

CodeStake is a full-stack platform that adds **real financial consequences** to competitive programming. It consists of a **Next.js web application** (problem arena, wallet, profile, admin panel) and a **Chrome Extension** that integrates directly into LeetCode to track submissions, enforce anti-cheat measures, and resolve stakes in real-time.

The core philosophy: **you only learn under pressure**. CodeStake turns every coding session into a high-stakes contract where your money is on the line.

---

## Features

### 🏟️ Built-in Problem Arena
- Browse and solve curated coding problems with a full-featured **Monaco code editor**
- Supports **Python 3**, **JavaScript**, **C++ 17**, **Java**, and **Go**
- Server-side code execution via [Wandbox](https://wandbox.org) with test case validation
- Separate **example** and **hidden** test cases (hidden inputs/outputs are redacted from client responses)
- Track solve status: unsolved, attempted, and solved per user

### ⚡ Quick Play Stakes
Micro-stake on a single problem with two brutal modes:
- **⏱️ Time Crunch** — Solve before the timer expires or lose your stake
- **🎯 One Shot** — Get the wrong answer even once and your stake is gone instantly

### 🩸 The Blood Pact
A multi-day streak contract. Commit to solving a daily quota of problems for up to 100 days. Miss a single day's quota and you incur a massive financial penalty. There is no pause button.

### ⚔️ The Gauntlet
Endurance mode. Solve a target number of problems back-to-back under a strict timer. Configurable problem count and duration.

### 🧠 Persona System
A dynamic personality engine that evolves based on your win/loss record:

| Tier | Name | Score Range | Vibe |
|------|------|-------------|------|
| 1 | **THE BROKEN** | < -20 | Harsh, disappointed |
| 2 | **THE SLIPPING** | -20 to -1 | Warning, urgent |
| 3 | **THE BOUND** | 0 | Neutral, contractual |
| 4 | **THE ASCENDING** | 1 to 20 | Encouraging, sharp |
| 5 | **THE GOD-COMPLEX** | > 20 | Arrogant, legendary |

Each tier has unique win/loss dialogue that is displayed in the Chrome Extension overlay after every resolution.

### 🛡️ Anti-Cheat System
The Chrome Extension enforces integrity during active stakes:
- **Clipboard blocking** — Copy, paste, and cut are disabled
- **Keyboard shortcut interception** — `Ctrl+C/V/X` are blocked
- **Typing speed trap** — Detects superhuman typing speed (15 chars in <200ms) and auto-fails the stake
- **Editor wipe on activation** — When a stake begins, the LeetCode editor is reset to the official boilerplate via GraphQL
- **Memory wipe trap** — If the user disables/re-enables the extension mid-stake, session memory is cleared and the stake is automatically failed

### 💳 Payment & Wallet System
- **Wallet** with balance tracking in cents (supports debt/negative balances)
- **Stripe** integration for global card payments
- **Razorpay** integration for Indian payment methods (UPI, cards, netbanking)
- Webhook-driven payment confirmation
- Users in debt are **locked out** from starting new stakes until they pay
- **Permanent ban** option — users can choose exile to escape their debt, permanently locking their account

### 🔧 Admin Panel
- Protected admin routes with role-based access control
- Problem management (create/edit problems with test cases)
- User oversight

### 🌐 Chrome Extension (LeetCode Integration)
- Injects a React overlay directly into LeetCode pages
- Intercepts LeetCode's `fetch` API to detect submission verdicts (`Accepted`, `Wrong Answer`, etc.)
- Communicates with the Next.js backend via a background service worker (bypasses Private Network Access restrictions)
- Auth sync between the website and extension via `chrome.storage`
- Full betting modal UI with stake configuration, contract management, and payment flows

---

## How It Works

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   LeetCode.com      │     │  Chrome Extension     │     │  Next.js Backend │
│                     │     │                       │     │                  │
│  User submits code  │────▶│  Interceptor catches  │────▶│  /api/extension/ │
│  (fetch hook)       │     │  verdict via fetch    │     │  resolve         │
│                     │     │  proxy                │     │                  │
│                     │     │  Anti-cheat enforced  │     │  Resolves stake  │
│                     │     │  Editor wiped on      │     │  Updates wallet  │
│                     │     │  stake activation     │     │  Updates persona │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │    Supabase     │
                                                         │                 │
                                                         │  - Auth         │
                                                         │  - Wallets      │
                                                         │  - Stakes       │
                                                         │  - Contracts    │
                                                         │  - Submissions  │
                                                         │  - Problems     │
                                                         │  - Transactions │
                                                         └─────────────────┘
```

### Stake Lifecycle

1. **User creates a stake** (Quick Play, Blood Pact, or Gauntlet)
2. **No money is taken upfront** — the user only pays if they fail
3. **Anti-cheat activates** — clipboard blocked, editor wiped to boilerplate
4. **User solves the problem** on LeetCode (or the built-in arena)
5. **Interceptor detects the verdict** from LeetCode's submission API
6. **Backend resolves the stake:**
   - ✅ `Accepted` → Stake marked as won, persona score increases
   - ❌ `Wrong Answer` / `Timer Expired` → Debt incurred, persona score decreases
7. **If in debt**, user must pay via Stripe/Razorpay before starting new stakes

---

## Architecture

The project is a **monorepo** with two independent packages:

| Component | Directory | Framework | Purpose |
|-----------|-----------|-----------|---------|
| **Web App** | `/src` | Next.js 16 + React 19 | Problem arena, auth, wallet, admin, API routes |
| **Chrome Extension** | `/extension` | Vite + React 19 + CRXJS | LeetCode overlay, interceptor, anti-cheat |

### Key Backend Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/execute` | POST | Execute code against test cases via Wandbox |
| `/api/extension/commit` | POST | Create a new Quick Play stake session |
| `/api/extension/resolve` | POST | Resolve a stake (win/loss) based on LeetCode verdict |
| `/api/extension/contracts` | GET/POST | Fetch/create Blood Pact and Gauntlet contracts |
| `/api/extension/session` | GET | Restore active session on page load |
| `/api/extension/wallet` | GET | Fetch wallet balance and persona score |
| `/api/extension/ban` | POST | Permanently ban a user |
| `/api/checkout/stripe` | POST | Create a Stripe checkout session |
| `/api/checkout/razorpay` | POST | Create a Razorpay order |
| `/api/webhooks/stripe` | POST | Stripe payment webhook |
| `/api/webhooks/razorpay` | POST | Razorpay payment webhook |
| `/api/submissions` | GET | Fetch user submission history |

---

## Tech Stack

### Web Application
- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS 4
- **Fonts:** Space Grotesk + JetBrains Mono (via `next/font`)
- **Design System:** Neo-Brutalism (bold borders, hard shadows, vibrant colors)
- **Code Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (via `@monaco-editor/react`)
- **Database & Auth:** [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Auth)
- **Code Execution:** [Wandbox API](https://wandbox.org)
- **Payments:** [Stripe](https://stripe.com) + [Razorpay](https://razorpay.com)

### Chrome Extension
- **Build Tool:** [Vite](https://vitejs.dev) + [CRXJS](https://crxjs.dev)
- **Language:** TypeScript + React 19
- **Styling:** Tailwind CSS 3
- **Manifest:** Chrome Extension Manifest V3
- **Architecture:** Content Script → Background Service Worker → Next.js API

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v20+)
- [npm](https://www.npmjs.com/) (v10+)
- A [Supabase](https://supabase.com) project
- [Stripe](https://stripe.com) account (for payments)
- [Razorpay](https://razorpay.com) account (optional, for Indian payments)

### 1. Clone the Repository

```bash
git clone https://github.com/SarthakSingh5/codestake.git
cd codestake
```

### 2. Install Dependencies

```bash
# Web app
npm install

# Chrome extension
cd extension
npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay (optional)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 4. Set Up Supabase

Your Supabase project needs the following tables:
- `profiles` — User profiles with roles and hardcore mode toggle
- `wallets` — Balance tracking (in cents), persona score, ban status
- `problems` — Coding problems with metadata
- `example_test_cases` — Visible test cases
- `hidden_test_cases` — Hidden judge test cases
- `submissions` — User submission history
- `stake_sessions` — Active/resolved Quick Play stakes
- `challenge_contracts` — Blood Pact and Gauntlet contracts
- `transactions` — Financial transaction log

You also need an `incur_debt` RPC function that atomically decrements wallet balance.

### 5. Run the Development Server

```bash
# Start the Next.js web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 6. Build the Chrome Extension

```bash
cd extension
npm run build
```

Then load the `extension/dist` directory as an unpacked extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` folder

---

## Project Structure

```
codestake/
├── src/                          # Next.js web application
│   ├── app/
│   │   ├── page.tsx              # Landing page (hero)
│   │   ├── layout.tsx            # Root layout (fonts, metadata)
│   │   ├── globals.css           # Neo-Brutalism design system
│   │   ├── login/                # Login page
│   │   ├── signup/               # Signup page
│   │   ├── problems/             # Problem arena
│   │   │   ├── page.tsx          # Problem listing
│   │   │   ├── ProblemsClient.tsx # Client-side filtering & display
│   │   │   └── [slug]/           # Individual problem workspace
│   │   │       ├── page.tsx      # Problem detail (server)
│   │   │       ├── ProblemWorkspace.tsx # Monaco editor + staking UI
│   │   │       └── CodeEditor.tsx # Monaco editor wrapper
│   │   ├── profile/              # User profile & stats
│   │   ├── wallet/               # Wallet management + deposits
│   │   ├── admin/                # Admin panel (problem CRUD)
│   │   ├── banned/               # Permanent ban page
│   │   ├── extension/            # Extension download page
│   │   ├── payment-success/      # Post-payment redirect
│   │   ├── actions/              # Server actions
│   │   │   ├── stake.ts          # Stake creation, failure, lazy eval
│   │   │   ├── ban.ts            # Ban enforcement
│   │   │   └── hardcore.ts       # Hardcore mode toggle
│   │   ├── api/                  # API routes
│   │   │   ├── execute/          # Code execution endpoint
│   │   │   ├── submissions/      # Submission history
│   │   │   ├── checkout/         # Stripe & Razorpay checkout
│   │   │   ├── webhooks/         # Payment webhooks
│   │   │   └── extension/        # Extension-facing APIs
│   │   │       ├── commit/       # Create stake sessions
│   │   │       ├── resolve/      # Resolve stakes (win/loss)
│   │   │       ├── contracts/    # Blood Pact & Gauntlet CRUD
│   │   │       ├── session/      # Session restoration
│   │   │       ├── sessions/     # Active sessions list
│   │   │       ├── wallet/       # Wallet balance API
│   │   │       ├── ban/          # Ban API
│   │   │       ├── unban/        # Unban API
│   │   │       └── checkout/     # Extension-initiated checkout
│   │   └── components/           # Shared UI components
│   │       ├── Navbar.tsx        # Main navigation bar
│   │       ├── AuthForm.tsx      # Login/signup form
│   │       ├── HardcoreToggle.tsx # Hardcore mode switch
│   │       └── ExtensionSync.tsx # Extension auth sync
│   ├── lib/
│   │   ├── languages.ts          # Supported language configs
│   │   ├── wandbox.ts            # Wandbox API client
│   │   ├── internalStake.ts      # Admin-level stake resolution
│   │   ├── persona.ts            # Persona tier system
│   │   └── supabase/             # Supabase client variants
│   │       ├── server-client.ts  # Server component client
│   │       ├── browser-client.ts # Browser client
│   │       ├── admin-client.ts   # Service role client
│   │       └── proxy-client.ts   # Middleware/proxy client
│   └── proxy.ts                  # Route protection & auth proxy
│
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── manifest.json             # Extension manifest
│   ├── src/
│   │   ├── content.tsx           # Main content script (LeetCode overlay)
│   │   ├── interceptor.js        # Fetch hook for submission detection
│   │   ├── background.ts         # Service worker (API proxy, auth sync)
│   │   ├── website-sync.ts       # Website ↔ Extension auth bridge
│   │   ├── App.tsx               # Extension popup app
│   │   ├── types.ts              # Shared TypeScript types
│   │   ├── components/
│   │   │   ├── BettingModal.tsx   # Full stake configuration UI
│   │   │   ├── ActiveTracker.tsx  # Active stake tracker overlay
│   │   │   ├── NotificationBubble.tsx # Minimized notification
│   │   │   └── Unauthenticated.tsx # Auth prompt
│   │   ├── hooks/
│   │   │   ├── useAntiCheat.ts   # Anti-cheat enforcement
│   │   │   └── useSessionTimer.ts # Countdown timer logic
│   │   └── lib/
│   │       └── PersonalityDialogues.ts # Tier-based win/loss messages
│   └── vite.config.ts            # Vite + CRXJS build config
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local                    # Environment variables (not committed)
```

---

## Design Philosophy

CodeStake uses a **Neo-Brutalism** design system characterized by:
- **Bold 4px black borders** on all interactive elements
- **Hard box shadows** (`6px 6px 0 0 #000`) that shift on hover/click
- **Vibrant, unapologetic colors:** `#00ff66` (green), `#ff3333` (red), `#ffcc00` (yellow)
- **Uppercase, heavy typography** with tight letter-spacing
- **Dot-grid background texture** for visual depth
- **Zero border-radius** — all corners are sharp

---

## License

This project is currently private. All rights reserved.

---

<p align="center">
  <strong>"The only way to win is to raise the stakes."</strong><br/>
  <em>— CodeStake Philosophy</em>
</p>
