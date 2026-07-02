import { useState } from "react";
import { Heart, Info, Lightbulb, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Link } from "wouter";

const FAQ_ITEMS = [
  {
    question: "How do I earn points?",
    answer: "Complete social media tasks such as liking, following, sharing, or commenting on posts. Each task shows the points you'll earn before you start.",
  },
  {
    question: "How does the referral programme work?",
    answer: "Share your unique referral link with friends. When they sign up and complete tasks, you earn bonus points based on your referral tier.",
  },
  {
    question: "When do my daily login streak bonuses reset?",
    answer: "Streaks reset at midnight UTC. Log in every day to keep your streak alive and unlock higher multiplier bonuses.",
  },
  {
    question: "How do I redeem my points?",
    answer: "Visit the Rewards page to see available redemption options. Points can be exchanged for gift cards, cash rewards, or other prizes.",
  },
  {
    question: "What happens if I miss a day on my streak?",
    answer: "Missing a day resets your streak back to zero. We recommend enabling notifications so you never forget to log in.",
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

      {/* Bottom bar */}
      <div className="border-t border-border py-3 md:py-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Copyright Info */}
            <div className="flex items-center justify-center md:justify-start">
              <Info className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-xs md:text-sm text-muted-foreground">
                © {currentYear} Social Growth Platform
              </span>
            </div>

            {/* Support */}
            <div className="flex items-center justify-center">
              <Lightbulb className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Need help? <Link to="/support" className="text-primary hover:underline">Contact Support</Link>
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
