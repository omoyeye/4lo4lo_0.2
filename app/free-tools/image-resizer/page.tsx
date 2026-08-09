import type { Metadata } from "next";
import { getTool } from "@/lib/tools-registry";
import { pageMetadata, jsonLd } from "@/lib/seo";
import { ToolPageShell, faqJsonLd, type FaqItem } from "@/components/tools/ToolPageShell";
import { ImageResizer } from "@/components/tools/ImageResizer";

const tool = getTool("image-resizer")!;

export const metadata: Metadata = pageMetadata({
  title: tool.title,
  description: tool.description,
  path: `/free-tools/${tool.slug}`,
  keywords: tool.keywords,
  ogTag: "Free tool",
});

const faq: FaqItem[] = [
  {
    question: "What size should an Instagram post be?",
    answer:
      "1080×1080 for a square, 1080×1350 for portrait, and 1080×1920 for stories and reels. Portrait takes up the most vertical space in the feed, which is why most creators default to it.",
  },
  {
    question: "What size is a YouTube thumbnail?",
    answer:
      "1280×720 pixels, a 16:9 ratio, under 2MB. Design it so the subject still reads at roughly 210 pixels wide, because that is closer to the size most viewers actually see it at.",
  },
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. The resizing happens on a canvas inside your browser using JavaScript. The file never leaves your device, which means unpublished content stays private and the tool works the same whether your connection is fast or slow.",
  },
  {
    question: "Why does my image look blurry after resizing?",
    answer:
      "Because the source was smaller than the target, so it had to be upscaled, enlarging an image cannot add detail that was not captured. The tool warns you when this will happen. Start from the largest original you have.",
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
        intro="Resize and crop any image to the exact dimensions each platform expects. Everything happens in your browser, nothing is uploaded."
        faq={faq}
        explainer={
          <>
            <h2>Why the right dimensions matter</h2>
            <p>
              Upload the wrong ratio and the platform crops it for you, usually
              badly and usually through the part you cared about. Text gets cut
              off, faces get halved, and a thumbnail that looked deliberate in
              your editor looks careless in the feed.
            </p>
            <p>
              Getting it right also protects quality. Platforms re-compress
              anything that does not match their expected size, and re-compression
              is where sharpness goes.
            </p>

            <h2>Crop to fill, or fit the whole image?</h2>
            <ul>
              <li>
                <strong>Crop to fill</strong> covers the frame completely with no
                bars, at the cost of trimming the edges. Right for photos and
                almost always right for feed posts.
              </li>
              <li>
                <strong>Fit whole image</strong> keeps everything visible and pads
                with white. Right when the edges carry information, text,
                diagrams, screenshots, product shots where the whole object
                matters.
              </li>
            </ul>

            <h2>Common sizes worth remembering</h2>
            <ul>
              <li>Instagram portrait post, 1080×1350</li>
              <li>Instagram story / reel, 1080×1920</li>
              <li>YouTube thumbnail, 1280×720</li>
              <li>X post image, 1600×900</li>
              <li>LinkedIn post, 1200×627</li>
              <li>Link preview / Open Graph, 1200×630</li>
            </ul>

            <h2>Design for the small version</h2>
            <p>
              Almost nobody sees your image at full size. A thumbnail is often
              rendered a few hundred pixels wide on a phone. Before you publish,
              shrink the preview until it is that size: if the subject is not
              instantly readable, the composition needs to be simpler, not the
              resolution higher.
            </p>

            <h2>Nothing leaves your device</h2>
            <p>
              Most free resizers upload your file to a server, process it there
              and hand back a link, which means your unreleased content sits on
              someone else&apos;s infrastructure under whatever terms they wrote.
              This tool uses a canvas element in your own browser. Turn off your
              connection after the page loads and it still works.
            </p>
          </>
        }
      >
        <ImageResizer />
      </ToolPageShell>
    </>
  );
}
