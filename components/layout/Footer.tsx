"use client";

import { useState } from "react";
import { Heart, Info, Lightbulb, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import Link from "next/link";
import { openCookieConsent } from "@/components/CookieConsent";
import SocialLinks from "@/components/brand/SocialLinks";
import { useBrand } from "@/hooks/use-brand";

// Kept factual: these answers are what the platform actually does (see
// lib/legal-content.ts). The previous copy promised gift cards and streak
// "multipliers" that don't exist.
const FAQ_ITEMS = [
  {
    question: "How do I earn points?",
    answer: "Complete social media tasks such as liking, following, sharing or commenting on posts. Each task shows its points before you start. Some tasks ask for a screenshot; those points are added once the proof is approved.",
  },
  {
    question: "How does the referral programme work?",
    answer: "Share your referral link. When genuine new members join with it and take part, you earn the referral reward for your tier, shown on the Referral page.",
  },
  {
    question: "How do daily streaks work?",
    answer: "Open 4LO4LO once a day to check in and grow your streak. Days are counted in UTC. Reaching streak milestones (for example 7 or 30 days) pays a bonus.",
  },
  {
    question: "How do I withdraw my points?",
    answer: "Go to Payments, confirm your email address if you haven't, and request a withdrawal by PayPal or bank transfer. Points are held while we review the request and usually paid within 1 to 7 business days.",
  },
  {
    question: "What happens if I miss a day on my streak?",
    answer: "Your streak starts again from day 1 at your next check-in. Points you already earned are not affected.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-3 text-left gap-3 hover:text-primary transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="text-xs md:text-sm text-muted-foreground pb-3 leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const brand = useBrand();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
          <h3 className="text-sm font-semibold">Frequently Asked Questions</h3>
        </div>
        <div className="max-w-2xl">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>

      <div className="container mx-auto flex flex-col items-center gap-2 px-4 pb-5 md:flex-row md:justify-between">
        <p className="text-xs text-muted-foreground">{brand.tagline}</p>
        <SocialLinks size="sm" />
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border py-3 md:py-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Copyright Info */}
            <div className="flex items-center justify-center md:justify-start">
              <Info className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-xs md:text-sm text-muted-foreground">
                © {currentYear} {brand.name} ·{" "}
                <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link> ·{" "}
                <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link> ·{" "}
                <button type="button" onClick={openCookieConsent} className="hover:text-foreground hover:underline">
                  Cookie Preferences
                </button>
              </span>
            </div>

            {/* Support */}
            <div className="flex items-center justify-center">
              <Lightbulb className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Need help? <Link href="/support" className="text-primary hover:underline">Contact Support</Link>
              </span>
            </div>

            {/* Designer Credit */}
            <div className="flex items-center justify-center md:justify-end">
              <Heart className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Designed by{" "}
                <a
                  href="https://www.surpluslink.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  surpluslink
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
