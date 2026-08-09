/**
 * Registry of the public creator tools.
 *
 * One definition per tool drives the hub page, each tool's metadata, the
 * sitemap and the cross-links between tools. Adding a tool means adding an
 * entry here plus its page — nothing else needs updating.
 *
 * These pages exist to rank: each targets a distinct keyword a creator would
 * actually search, and each is a route into signup.
 */

export interface ToolDefinition {
  /** URL segment under /free-tools. */
  slug: string;
  /** Short label for cards and nav. */
  name: string;
  /** <title> — written for search, not for the UI. */
  title: string;
  /** Meta description, ~150-160 chars. */
  description: string;
  /** One-line pitch shown on the card. */
  tagline: string;
  keywords: string[];
  /** Lucide icon name, resolved by the hub page. */
  icon: string;
  /**
   * Set when the tool lives somewhere other than /free-tools/<slug>.
   * QR and shortener are still embedded in the hub page; they are listed here
   * so the hub renders them alongside the rest, but they get no own-page
   * sitemap entry until they are extracted.
   */
  href?: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "engagement-rate-calculator",
    name: "Engagement Rate Calculator",
    title: "Free Engagement Rate Calculator for Instagram, TikTok & YouTube",
    description:
      "Calculate your engagement rate in seconds and see how it compares to benchmarks for your follower tier. Works for Instagram, TikTok, YouTube, X and Facebook.",
    tagline:
      "Work out your true engagement rate and see how you compare to creators your size.",
    keywords: [
      "engagement rate calculator",
      "instagram engagement rate",
      "tiktok engagement rate",
      "social media engagement calculator",
      "how to calculate engagement rate",
    ],
    icon: "Activity",
  },
  {
    slug: "best-time-to-post",
    name: "Best Time to Post",
    title: "Best Time to Post on Social Media — Free Timezone Planner",
    description:
      "See general posting-time guidance for Instagram, TikTok, YouTube, X, Facebook and LinkedIn, converted to your own timezone so you can plan a realistic schedule.",
    tagline:
      "Posting-window guidance for every major platform, converted to your timezone.",
    keywords: [
      "best time to post",
      "best time to post on instagram",
      "best time to post on tiktok",
      "social media posting schedule",
      "when to post on social media",
    ],
    icon: "Clock",
  },
  {
    slug: "hashtag-generator",
    name: "Hashtag Generator",
    title: "Free Hashtag Generator for Instagram & TikTok",
    description:
      "Turn a topic into a structured hashtag set — broad, niche and long-tail — sized for the platform you are posting to. Copy the whole set in one click.",
    tagline:
      "Build a balanced hashtag set from one keyword, sized for each platform.",
    keywords: [
      "hashtag generator",
      "instagram hashtag generator",
      "tiktok hashtags",
      "free hashtag tool",
      "hashtag ideas",
    ],
    icon: "Hash",
  },
  {
    slug: "caption-generator",
    name: "Caption & Bio Generator",
    title: "Free Social Media Caption and Bio Generator",
    description:
      "Generate caption and bio variations in different tones — punchy, story-led, question-first, listicle — with hook, body and call-to-action structure you can edit.",
    tagline:
      "Caption and bio starting points in several tones, structured to actually convert.",
    keywords: [
      "caption generator",
      "instagram bio generator",
      "social media caption ideas",
      "free bio generator",
      "tiktok caption ideas",
    ],
    icon: "PenLine",
  },
  {
    slug: "follower-growth-tracker",
    name: "Follower Growth Tracker",
    title: "Free Follower Growth Tracker & Projection Tool",
    description:
      "Log follower counts over time to see your real growth rate, daily average and a projection of when you will hit your next milestone. Saved in your browser.",
    tagline:
      "Track real growth over time and project when you will hit your next milestone.",
    keywords: [
      "follower growth tracker",
      "instagram follower tracker",
      "social media growth calculator",
      "follower growth rate",
      "follower projection",
    ],
    icon: "TrendingUp",
  },
  {
    slug: "image-resizer",
    name: "Image Resizer",
    title: "Free Social Media Image Resizer — Every Platform Size",
    description:
      "Resize and crop images to the exact dimensions each platform expects — Instagram posts and stories, TikTok, YouTube thumbnails, X, LinkedIn and Facebook. Runs in your browser.",
    tagline:
      "Resize any image to exact platform dimensions, without uploading it anywhere.",
    keywords: [
      "social media image resizer",
      "instagram image size",
      "youtube thumbnail size",
      "image resizer free",
      "social media image dimensions",
    ],
    icon: "Crop",
  },
  {
    slug: "qr-code-generator",
    name: "QR Code Generator",
    title: "Free QR Code Generator for Creators",
    description:
      "Turn any link or text into a downloadable QR code you can put on merch, packaging, a stream overlay or a business card.",
    tagline: "Turn any URL or text into a downloadable QR code.",
    keywords: ["qr code generator", "free qr code", "qr code for instagram"],
    icon: "QrCode",
    href: "/free-tools#qr",
  },
  {
    slug: "link-shortener",
    name: "URL Shortener",
    title: "Free URL Shortener for Social Media Bios",
    description:
      "Shorten long links into clean, shareable URLs that fit in a bio and look trustworthy in a caption.",
    tagline: "Shorten long links into clean, shareable URLs.",
    keywords: ["url shortener", "link shortener", "short link for bio"],
    icon: "Link2",
    href: "/free-tools#shortener",
  },
];

/** Tools that have their own indexable page. */
export const STANDALONE_TOOLS = TOOLS.filter((t) => !t.href);

export function toolHref(t: ToolDefinition): string {
  return t.href ?? `/free-tools/${t.slug}`;
}

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Tools other than the given one, for cross-linking at the foot of each page. */
export function otherTools(slug: string, limit = 3): ToolDefinition[] {
  return TOOLS.filter((t) => t.slug !== slug).slice(0, limit);
}
