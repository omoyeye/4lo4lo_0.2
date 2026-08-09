import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { CaptionGenerator } from "@/components/tools/CaptionGenerator";

const tool = getTool("caption-generator")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "How long should a social media caption be?",
    answer:
      "Long enough to be worth reading. Short captions suit strong visuals; longer ones work when the text is the content. What matters far more than length is the first line, because that is all most people see before deciding whether to tap 'more'.",
  },
  {
    question: "How many characters can an Instagram bio be?",
    answer:
      "150 characters, including spaces and line breaks. The generator shows a character count on each bio option so you can see whether it fits before you paste it.",
  },
  {
    question: "Are these AI-generated captions?",
    answer:
      "No. They are built from writing templates, so they load instantly and cost nothing to use. They are structured starting points designed to be edited into your own voice, not finished copy you should post as-is.",
  },
  {
    question: "What makes a caption get comments?",
    answer:
      "Asking one specific, easy question. 'What do you think?' gets ignored; 'Which of these three would you actually try?' gets answers. Give people something low-effort and concrete to respond to.",
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
        intro="Describe your post and get caption options in several tones, plus bio variations with live character counts."
        faq={faq}
        explainer={
          <>
            <h2>Every caption has three jobs</h2>
            <p>
              Most captions fail because they try to do one thing, describe the
              picture. A caption that earns engagement does three:
            </p>
            <ul>
              <li>
                <strong>The hook</strong> stops the scroll. It is the first line,
                and it is the only part guaranteed to be read. Spend
                disproportionate effort here.
              </li>
              <li>
                <strong>The body</strong> delivers on what the hook promised. If
                it does not, people bounce and the platform notices.
              </li>
              <li>
                <strong>The call to action</strong> tells people exactly what to
                do next. Vague invitations get nothing. Specific ones get replies.
              </li>
            </ul>

            <h2>Tone changes who responds</h2>
            <p>
              The same idea written five different ways will reach five slightly
              different audiences. Punchy lines get shares. Story-led captions
              get saves and long comments. Questions get replies. Listicles get
              saves and screenshots. Cycling deliberately between them is more
              useful than finding one format and repeating it forever.
            </p>

            <h2>Writing a bio that converts</h2>
            <p>
              A bio has 150 characters to answer one question: why should I
              follow you? Not who you are, what someone gets by staying. The
              strongest bios name a specific audience and a specific benefit,
              then point at one link.
            </p>
            <p>
              Avoid listing unrelated interests, avoid job titles nobody outside
              your industry recognises, and put the most important line first, on mobile, the rest is often truncated.
            </p>

            <h2>Edit before you post</h2>
            <p>
              Templates are a starting point, not a finished caption. The
              generator gives you structure and rhythm; your voice, your
              specifics and your actual opinion are what make people follow. A
              caption that reads like it could have been written for anyone will
              perform like it.
            </p>
          </>
        }
      >
        <CaptionGenerator />
      </ToolPageShell>
    </>
  );
}
