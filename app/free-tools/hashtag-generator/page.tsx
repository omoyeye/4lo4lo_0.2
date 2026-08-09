import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { HashtagGenerator } from "@/components/tools/HashtagGenerator";

const tool = getTool("hashtag-generator")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "How many hashtags should I use on Instagram?",
    answer:
      "Instagram permits 30, but most accounts do better with 8–15 tightly relevant ones. Thirty loose tags attracts bots and tells the algorithm very little about who should see your post.",
  },
  {
    question: "Do hashtags still work?",
    answer:
      "Less than they did, and less than captions and on-screen text, which platforms now read directly for topic classification. They still help categorise a post and they still surface content in tag feeds and search — just treat them as one signal rather than a growth strategy.",
  },
  {
    question: "Should I use popular or niche hashtags?",
    answer:
      "Both, in a mix. Very popular tags bury you within seconds. Niche tags have less traffic but you can realistically stay near the top of them, which is where the views come from. A balanced set gives you a chance in both.",
  },
  {
    question: "Where should hashtags go — caption or first comment?",
    answer:
      "It makes no measurable difference to reach on Instagram. Putting them in the first comment keeps the caption clean, which is the only real argument either way.",
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
        intro="Enter a topic and get a structured hashtag set — broad, niche and long-tail — sized to the platform you are posting on."
        faq={faq}
        explainer={
          <>
            <h2>The mix matters more than the count</h2>
            <p>
              The common mistake is using thirty hashtags that are all enormous.
              A tag with fifty million posts will bury your content within
              seconds of publishing, no matter how good it is. A tag with five
              thousand posts might keep you visible for days.
            </p>
            <p>A set that works usually contains three layers:</p>
            <ul>
              <li>
                <strong>Broad</strong> — large, competitive tags. Low odds, but
                enormous upside if a post takes off.
              </li>
              <li>
                <strong>Niche</strong> — specific to your subject. This is where
                you can realistically rank and stay ranked, and where most of
                your actual reach will come from.
              </li>
              <li>
                <strong>Long-tail</strong> — highly specific phrases. Very
                little traffic, but the people searching them are exactly your
                audience and they convert far better.
              </li>
            </ul>

            <h2>Why this tool does not show volume numbers</h2>
            <p>
              Plenty of hashtag tools display a confident-looking post count or
              &ldquo;popularity score&rdquo; next to every tag. Unless the tool
              is paying for live platform data, those numbers are estimates at
              best and invented at worst — and creators make real posting
              decisions on them.
            </p>
            <p>
              This generator builds the structure, which is the part that
              reliably helps. Check the tags that matter directly in the app
              before you commit to them: it takes seconds and gives you real
              numbers instead of guessed ones.
            </p>

            <h2>Check for banned and hijacked tags</h2>
            <p>
              A small number of hashtags are restricted, and others have been
              overrun by content unrelated to their original meaning. Using one
              can suppress a post&apos;s reach entirely. No offline generator can
              detect this — search the tag in the app first, and if the results
              look nothing like your topic, drop it.
            </p>

            <h2>Rotate your sets</h2>
            <p>
              Pasting the identical block of thirty tags onto every post is a
              recognisable spam pattern. Keep three or four sets for different
              content types and vary them.
            </p>
          </>
        }
      >
        <HashtagGenerator />
      </ToolPageShell>
    </>
  );
}
