"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide on embed / checkout modals
  if (pathname?.startsWith("/wallet/embed")) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-neutral-300 text-black font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Brand & Copyright */}
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-black">
              CodeStake
            </span>
            <span className="text-neutral-500 font-mono">
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>

          {/* Legal & WhatsApp Support */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-neutral-600">
            <Link href="/terms" className="hover:text-black underline">
              Terms &amp; Policies
            </Link>
            <span>•</span>
            <span>
              WhatsApp:{" "}
              <a
                href="https://wa.me/919306956061"
                target="_blank"
                rel="noreferrer"
                className="text-black font-bold underline"
              >
                +91 9306956061
              </a>
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 pt-3 border-t border-neutral-100 text-center md:text-left text-[11px] font-mono text-neutral-500 leading-relaxed">
          Skill-based behavioral commitment platform • Not gambling • LeetCode is a registered trademark of LeetCode LLC (CodeStake is an independent tool not affiliated with or endorsed by LeetCode LLC).
        </div>
      </div>
    </footer>
  );
}
