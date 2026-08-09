import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { BestTimeToPost } from "@/components/tools/BestTimeToPost";

const tool = getTool("best-time-to-post")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "What is the best time to post on Instagram?",
    answer:
      "Broadly, weekday late mornings (11am–1pm) and evenings (7–9pm) local to your audience, with Tuesday to Thursday the strongest days. Treat that as a starting point — your own analytics will beat any published average within two weeks of testing.",
  },
  {
    question: "Does posting time actually matter?",
    answer:
      "It matters most in the first hour, because early engagement signals to the algorithm whether to keep distributing a post. It matters far less than the content itself. Good content posted at a mediocre time still outperforms weak content posted perfectly.",
  },
  {
    question: "Should I post in my timezone or my audience's?",
    answer:
      "Your audience's, always. If most of your followers are in a different region, schedule to their peak hours rather than your own. Every platform's analytics shows you where your audience is based.",
  },
  {
    question: "How do I find my own best time to post?",
    answer:
      "Pick two candidate windows, post consistently in each for two weeks, and compare reach in the first hour. Change one variable at a time. Your own data on your own audience is worth more than any benchmark table, including this one.",
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
        intro="General posting-window guidance for each platform, converted to your local timezone so you can build a schedule you will actually keep."
        faq={faq}
        explainer={
          <>
            <h2>Why the first hour is the part that matters</h2>
            <p>
              Every major feed works roughly the same way: a new post is shown
              to a small slice of your audience, and how that slice responds
              decides whether it gets shown to more people. Posting when your
              audience is awake and scrolling gives that first test the best
              chance of passing. That is the entire mechanism — there is nothing
              magical about a specific clock time.
            </p>

            <h2>Read this table honestly</h2>
            <p>
              The windows above are general industry patterns, converted to your
              timezone. They are not measurements of your audience, and any tool
              claiming otherwise without access to your analytics is guessing.
              What they are good for is giving you a defensible starting
              schedule instead of posting at random, which is what most people
              do.
            </p>
            <p>
              Two weeks of consistent posting in one window will tell you more
              than any benchmark. Then change the window and compare.
            </p>

            <h2>Consistency beats optimisation</h2>
            <p>
              A creator posting at a mediocre time four times a week will
              outgrow one posting at the theoretically perfect time whenever
              they remember. Audiences learn your rhythm; algorithms reward
              reliability. Pick a schedule you can hold on a bad week, not the
              one that looks best on paper.
            </p>

            <h2>Platform differences worth knowing</h2>
            <ul>
              <li>
                <strong>TikTok</strong> has the widest useful window — late
                evening performs unusually well, and content can surface days
                after posting, so timing matters less than elsewhere.
              </li>
              <li>
                <strong>X</strong> has the shortest half-life of any major
                platform. Frequency matters far more than picking the right hour.
              </li>
              <li>
                <strong>YouTube</strong> rewards publishing a few hours{" "}
                <em>before</em> your peak viewing time, so the algorithm has
                finished its initial testing when your audience arrives.
              </li>
              <li>
                <strong>LinkedIn</strong> is strictly business hours in your
                audience&apos;s region. Weekend posting is close to dead.
              </li>
            </ul>
          </>
        }
      >
        <BestTimeToPost />
      </ToolPageShell>
    </>
  );
}
