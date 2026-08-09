import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { EngagementRateCalculator } from "@/components/tools/EngagementRateCalculator";

const tool = getTool("engagement-rate-calculator")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "How is engagement rate calculated?",
    answer:
      "Add up your interactions on a post, likes, comments, shares and saves, divide by your follower count, and multiply by 100. This calculator uses followers rather than reach, because reach is not publicly visible for most accounts.",
  },
  {
    question: "What is a good engagement rate?",
    answer:
      "It depends heavily on platform and account size. Roughly, 1-3% is normal on Instagram, 4-9% on TikTok and under 1% on X. Smaller accounts almost always show higher rates than large ones, so compare yourself to creators of a similar size rather than to a global average.",
  },
  {
    question: "Why is my engagement rate falling as I grow?",
    answer:
      "This is normal and expected. Early followers are your most invested ones. As an audience broadens it inevitably contains more passive followers, so the percentage drops even while total interactions rise. Track total interactions alongside the rate.",
  },
  {
    question: "Should I use reach or followers?",
    answer:
      "Engagement by reach is the more accurate measure of content quality, and you can calculate it from your own analytics. Engagement by followers is the standard for comparing accounts, because it is the only figure visible from the outside, which is why brands use it when evaluating creators.",
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
        intro="Enter your follower count and typical interactions to get your engagement rate, plus the benchmark range for your platform."
        faq={faq}
        explainer={
          <>
            <h2>What engagement rate actually tells you</h2>
            <p>
              Follower count tells you how many people <em>could</em> see your
              work. Engagement rate tells you how many of them care. It is the
              first number a brand looks at when deciding whether a partnership
              is worth paying for, and it is the number most creators track
              least carefully.
            </p>
            <p>
              The formula is simple: total interactions divided by followers,
              times 100. The judgement is in what counts as an interaction.
              Likes are the cheapest signal, a double-tap costs nothing.
              Comments, shares and saves take real effort, and every major
              platform weights them far more heavily when deciding what to
              distribute. If you are optimising for one number, optimise for
              saves and shares.
            </p>

            <h2>Compare against your size, not against a global average</h2>
            <p>
              A 10,000-follower account with 4% engagement and a
              500,000-follower account with 1% engagement are not in different
              leagues of quality, that gap is mostly arithmetic. Audiences
              broaden as they grow, and broader audiences engage less per head.
              Published benchmarks that quote a single figure for a whole
              platform are hiding this.
            </p>

            <h2>How to move the number</h2>
            <ul>
              <li>
                <strong>Ask for the interaction you want.</strong> Posts that
                end with a specific question get more comments than posts that
                end with a statement. This is the highest-leverage change most
                people have not made.
              </li>
              <li>
                <strong>Make something worth saving.</strong> Saves are the
                strongest ranking signal on most platforms. Reference material,
                checklists and step-by-step content get saved; opinions do not.
              </li>
              <li>
                <strong>Reply to every comment for the first hour.</strong>{" "}
                Replies count as engagement and pull the original commenter back.
              </li>
              <li>
                <strong>Post less, but better.</strong> Engagement rate is an
                average. Publishing filler to keep a streak alive drags it down.
              </li>
            </ul>

            <h2>A caveat about bought engagement</h2>
            <p>
              Engagement pods and purchased likes inflate the number without
              improving the audience, and because the interactions come from
              accounts with no genuine interest, platforms increasingly discount
              them. A brand doing due diligence will look at the comments
              themselves, not just the ratio. A real 2% is worth more than a
              manufactured 6%.
            </p>
          </>
        }
      >
        <EngagementRateCalculator />
      </ToolPageShell>
    </>
  );
}
