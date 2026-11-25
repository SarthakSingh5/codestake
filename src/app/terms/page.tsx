import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export const metadata: Metadata = {
  title: "Terms & Policies | CodeStake",
  description: "Terms of Service, Privacy Policy, Refund Policy, and Support for CodeStake.",
};

export default function UnifiedPoliciesPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white text-black font-sans">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 w-full">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-xs font-mono font-bold text-neutral-600 hover:text-black uppercase tracking-wider"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="border-b-2 border-black pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            CodeStake Terms &amp; Policies
          </h1>
          <p className="text-xs font-mono text-neutral-500">
            Last Updated: November 2026 • Effective Immediately
          </p>
        </div>

        {/* Plain Anchor Links */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono border-b border-neutral-300 pb-4 mb-8 text-neutral-600">
          <a href="#terms" className="hover:text-black underline">1. Terms of Service</a>
          <span>•</span>
          <a href="#privacy" className="hover:text-black underline">2. Privacy Policy</a>
          <span>•</span>
          <a href="#refund" className="hover:text-black underline">3. Refund Policy</a>
          <span>•</span>
          <a href="#support" className="hover:text-black underline">4. Support</a>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm leading-relaxed text-neutral-900 font-sans">

          {/* 1. TERMS OF SERVICE */}
          <section id="terms" className="scroll-mt-20 border-b border-neutral-300 pb-8 space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-black">
              1. Terms of Service &amp; Commitment Contracts
            </h2>

            <p>
              <strong>Platform Nature:</strong> CodeStake is a skill-based behavioral commitment and accountability tool designed to assist software engineers in deliberate algorithm practice. CodeStake is <strong>not</strong> a gambling service, casino, sportsbook, or game of chance. All challenges are 100% determined by personal programming skill and algorithmic correctness.
            </p>

            <p>
              <strong>The Post-Pay Debt Model:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-800">
              <li><strong>Zero Upfront Cost:</strong> Participating in challenges requires no upfront deposit or prepaid wallet balance.</li>
              <li><strong>Victory:</strong> Achieving an &ldquo;Accepted&rdquo; verdict on LeetCode and completing the challenge resolves it successfully at $0.00 fee.</li>
              <li><strong>Defeat &amp; Debt:</strong> If you fail the challenge, your self-selected forfeiture penalty is recorded as an outstanding balance on your account&rsquo;s Debt Ledger.</li>
              <li><strong>Preventative Anti-Cheat:</strong> Browser extension anti-cheat mechanisms (such as clipboard restrictions and boilerplate resets) function exclusively as preventative interview simulation controls to deter external code insertion. Anti-cheat events do not trigger challenge forfeiture or debt penalties.</li>
              <li><strong>Debt Settlement:</strong> Outstanding debt must be cleared via our integrated payment processor (Stripe or Razorpay) to restore account standing and unlock future challenges.</li>
            </ul>

            <p>
              <strong>Eligibility &amp; Conduct:</strong> Users must be at least 18 years of age. The use of automated solver scripts, botting tools, artificial intelligence agents, or timer manipulation is strictly prohibited and constitutes grounds for immediate account suspension.
            </p>

            <p className="text-xs text-neutral-600 font-mono pt-2">
              <strong>Trademark Notice:</strong> LeetCode is a registered trademark of LeetCode LLC. CodeStake is an independent software tool and browser extension. CodeStake is not affiliated with, endorsed by, sponsored by, or associated with LeetCode LLC.
            </p>
          </section>

          {/* 2. PRIVACY POLICY */}
          <section id="privacy" className="scroll-mt-20 border-b border-neutral-300 pb-8 space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-black">
              2. Privacy Policy &amp; Chrome Permissions
            </h2>

            <p>
              <strong>Single Purpose:</strong> The CodeStake Chrome Extension has a single purpose: to observe active algorithm problem URLs and code submission verdicts on <code>leetcode.com</code> in order to track and evaluate your self-imposed commitment contracts.
            </p>

            <p>
              <strong>Permissions Justification:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-800">
              <li><code>storage</code>: Stores local authentication tokens, session timer countdown state, and user preferences locally in <code>chrome.storage.local</code>.</li>
              <li><code>activeTab</code>: Verifies connection and synchronizes session state when the user opens the extension on LeetCode.</li>
              <li><code>*://leetcode.com/*</code>: Detects problem identifiers, renders the in-page countdown badge, and detects submission verdicts (Accepted / Failed).</li>
            </ul>

            <p>
              <strong>Data Protection:</strong> We do not track or access any website outside of <code>leetcode.com</code>. We do not record keystrokes. We do not store credit or debit card numbers; all payments are processed directly by PCI-DSS compliant third parties (Stripe &amp; Razorpay). We do not sell or distribute personal data.
            </p>
          </section>

          {/* 3. REFUND POLICY */}
          <section id="refund" className="scroll-mt-20 border-b border-neutral-300 pb-8 space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-black">
              3. Refund &amp; Cancellation Policy
            </h2>

            <p>
              CodeStake charges $0 upfront to enter challenges. Winners pay $0.00.
            </p>
            <p>
              Payments made through Stripe or Razorpay represent the voluntary settlement of incurred forfeiture debt for verification and tracking services that have already been rendered in full. Consequently, voluntary debt settlements are final and non-refundable.
            </p>
            <p>
              If a verified platform technical malfunction caused an incorrect verdict, contact support via WhatsApp with your account details and LeetCode submission evidence for review.
            </p>
          </section>

          {/* 4. SUPPORT */}
          <section id="support" className="scroll-mt-20 pt-2 space-y-3">
            <h2 className="text-xl font-bold uppercase tracking-wide text-black">
              4. Customer Support
            </h2>

            <p className="text-neutral-800">
              For any account questions, technical inquiries, or payment assistance, message us on WhatsApp:
            </p>

            <div className="border border-neutral-300 p-4 font-mono text-sm bg-neutral-50">
              <span className="text-neutral-500 block text-xs uppercase mb-1">WhatsApp Support:</span>
              <a
                href="https://wa.me/919306956061"
                target="_blank"
                rel="noreferrer"
                className="text-base font-bold text-black underline"
              >
                +91 9306956061
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
