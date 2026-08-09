import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { FollowerGrowthTracker } from "@/components/tools/FollowerGrowthTracker";

const tool = getTool("follower-growth-tracker")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "How do I calculate my follower growth rate?",
    answer:
      "Subtract your starting follower count from your current one, divide by the starting count, and multiply by 100 for the percentage change. Divide the raw gain by the number of days between the two readings for a daily average.",
  },
  {
    question: "What is a good monthly growth rate?",
    answer:
      "For most accounts, 2–5% a month is steady and sustainable. Small accounts routinely see much higher percentages simply because the base is small. Consistency over six months tells you far more than any single month.",
  },
  {
    question: "Is my data stored anywhere?",
    answer:
      "No. Entries stay in your own browser's local storage and are never sent to a server. That also means clearing your browser data will remove them, so export a CSV if you want a permanent copy.",
  },
  {
    question: "How often should I log my follower count?",
    answer:
      "Weekly, on the same day. Daily readings are mostly noise — normal fluctuation will swamp the trend. Weekly points over a few months give you a signal you can actually act on.",
  },
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd(faq)) }}
      />
      <ToolPageShell
        tool={tool}
        intro="Log your follower count over time to see your real growth rate and a projection of when you will reach your next milestone."
        faq={faq}
        explainer={
          <>
            <h2>Why track this manually</h2>
            <p>
              Platform analytics show you the last 30 or 90 days and then forget.
              Growth is a long game, and the useful comparison is this quarter
              against two quarters ago — which nothing built into the apps will
              show you. Two minutes a week of manual logging gives you a record
              nobody can take away or reset.
            </p>

            <h2>Rate matters more than count</h2>
            <p>
              Going from 1,000 to 1,100 followers is a 10% month. Going from
              100,000 to 101,000 is a 1% month, despite being ten times the raw
              number. If you only track the total, you will misread a slowdown
              as progress. The percentage is the honest signal.
            </p>

            <h2>Watch for the inflection, not the number</h2>
            <p>
              The single most useful thing this tool surfaces is when your recent
              pace diverges from your average — the moment growth starts
              accelerating or stalling. That is the signal to look at what
              changed: a format, a posting frequency, a topic. A flat total tells
              you nothing about why.
            </p>

            <h2>Be sceptical of spikes</h2>
            <p>
              A sudden jump is usually one post breaking out, not a step change
              in your trajectory. The test is what happens over the following
              three weeks: if the new followers stay and engage, something real
              changed. If your engagement rate drops sharply while the follower
              count holds, you gained passengers rather than an audience.
            </p>

            <h2>Track alongside engagement</h2>
            <p>
              Follower growth on its own is a vanity metric — it is entirely
              possible to grow while your actual reach shrinks. Log your{" "}
              <a href="/free-tools/engagement-rate-calculator">
                engagement rate
              </a>{" "}
              on the same day each week. If followers rise while engagement
              falls, you are attracting the wrong audience, and the fix is
              upstream in what you are posting.
            </p>
          </>
        }
      >
        <FollowerGrowthTracker />
      </ToolPageShell>
    </>
  );
}
