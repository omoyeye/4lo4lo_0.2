/**
 * Guide content for /learn.
 *
 * Kept in source rather than the database on purpose:
 *  - it is version controlled and reviewable in a pull request;
 *  - the pages build statically, so they cost nothing to serve at any traffic
 *    level and there is no query on the critical path for a search visitor;
 *  - editing a guide does not require a production write.
 *
 * Classroom lessons are the database-backed half of /learn and live in
 * classroom_videos. The two are deliberately separate: lessons are video with
 * a points reward, guides are long-form text written to rank.
 *
 * To add a guide, add an entry here. The hub, the sitemap, the metadata and
 * the cross-links all derive from this array.
 */

export interface GuideSection {
  heading: string;
  /** Paragraphs. Rendered in order. */
  body: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
  /** Optional callout rendered as a highlighted aside. */
  callout?: string;
}

export interface Guide {
  slug: string;
  /** <title>, written for search. */
  title: string;
  /** H1, written for humans. Often shorter than the title. */
  heading: string;
  description: string;
  /** ISO date. Shown to readers and used for article schema. */
  published: string;
  updated?: string;
  /** Rough read time in minutes. */
  readMinutes: number;
  category: "Platform guides" | "Growth" | "Money" | "Content";
  keywords: string[];
  /** One-paragraph standfirst under the H1. */
  intro: string;
  sections: GuideSection[];
  /** Rendered as a short summary block near the top. */
  takeaways: string[];
  theme: {
    gradient: string;
    tint: string;
    accent: string;
    hover: string;
  };
}

const THEMES = {
  tiktok: {
    gradient: "from-rose-500 to-pink-600",
    tint: "bg-rose-50 dark:bg-rose-950/30",
    accent: "text-rose-600 dark:text-rose-400",
    hover: "hover:border-rose-400 dark:hover:border-rose-600",
  },
  instagram: {
    gradient: "from-fuchsia-500 to-purple-600",
    tint: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    hover: "hover:border-fuchsia-400 dark:hover:border-fuchsia-600",
  },
  growth: {
    gradient: "from-emerald-500 to-teal-600",
    tint: "bg-emerald-50 dark:bg-emerald-950/30",
    accent: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:border-emerald-400 dark:hover:border-emerald-600",
  },
  money: {
    gradient: "from-amber-500 to-orange-600",
    tint: "bg-amber-50 dark:bg-amber-950/30",
    accent: "text-amber-600 dark:text-amber-400",
    hover: "hover:border-amber-400 dark:hover:border-amber-600",
  },
  content: {
    gradient: "from-sky-500 to-blue-600",
    tint: "bg-sky-50 dark:bg-sky-950/30",
    accent: "text-sky-600 dark:text-sky-400",
    hover: "hover:border-sky-400 dark:hover:border-sky-600",
  },
} as const;

export const GUIDES: Guide[] = [
  {
    slug: "how-to-grow-on-tiktok",
    title: "How to Grow on TikTok in 2026: A Practical Guide",
    heading: "How to grow on TikTok in 2026",
    description:
      "What actually moves the needle on TikTok in 2026: watch time over follower count, the first two seconds, posting cadence, and the mistakes that quietly cap your reach.",
    published: "2026-08-09",
    readMinutes: 9,
    category: "Platform guides",
    keywords: [
      "how to grow on tiktok",
      "tiktok growth 2026",
      "get more views on tiktok",
      "tiktok algorithm explained",
      "tiktok for beginners",
    ],
    intro:
      "TikTok is the only major platform where an account with zero followers can reach a million people with its next post. That is the opportunity and the trap: distribution is decided almost entirely by the video, not by you, so the work is in making videos the system wants to push.",
    takeaways: [
      "Watch time and completion rate decide distribution, not your follower count.",
      "The first two seconds carry more weight than everything after them combined.",
      "Consistency beats volume. Three good videos a week outperforms daily filler.",
      "Comments are the cheapest lever most creators never pull.",
    ],
    sections: [
      {
        heading: "How TikTok actually decides what to show",
        body: [
          "Every video gets pushed to a small test audience first. What happens in that test decides whether it goes further. The signals that matter, roughly in order of weight, are completion rate, rewatches, shares, comments and likes.",
          "Notice what is not on that list: your follower count. TikTok evaluates the video, not the account. This is why a creator with 200 followers can out-reach one with 200,000, and why your last video doing badly does not doom your next one.",
          "The practical consequence is that video length is a strategic choice. A 12 second video that people finish twice will outperform a 90 second video that half the audience abandons, even though the longer one accumulated more total watch time.",
        ],
        callout:
          "If a video underperforms, the useful question is not why the algorithm buried it. It is where in the video people stopped watching. Your retention graph tells you the answer.",
      },
      {
        heading: "The first two seconds",
        body: [
          "Most videos are lost before the viewer consciously decides anything. A thumb is already moving, and your job is to interrupt it. That means the opening frame has to carry information: motion, a face, text on screen, or something visually unexpected.",
          "Avoid the slow build. A logo animation, a wave to camera, or three seconds of throat-clearing before the point are all reliable ways to lose half your audience. Start at the interesting part and give the context afterwards.",
          "On-screen text in the first frame is the single highest-leverage change most creators can make. It tells a viewer instantly whether this video is for them, and it works with the sound off.",
        ],
        bullets: [
          "Open on the result, then explain how you got there.",
          "Put a specific claim in the first frame, not a vague tease.",
          "Cut the intro. There is almost never a good reason for one.",
          "Assume sound is off until the viewer decides to turn it on.",
        ],
      },
      {
        heading: "Cadence: how often to post",
        body: [
          "The advice to post three times a day is mostly repeated by people selling scheduling software. In practice, posting more only helps if quality holds, and for almost everyone it does not.",
          "Three to five videos a week, sustained for three months, will teach you more than thirty videos in a fortnight followed by burnout. You need enough volume to learn what works and enough care that each video is a real test.",
          "Consistency also matters for a duller reason: it gives you data. If you post erratically you cannot tell whether a good week was your content or the calendar.",
        ],
        callout:
          "Pick a schedule you could still hold during a bad week. That is your real cadence. Everything above it is a bonus, not the baseline.",
      },
      {
        heading: "Comments are underused",
        body: [
          "Comments are weighted heavily and they are the easiest signal to influence deliberately. Most creators end a video with a statement, which gives the viewer nothing to do.",
          "Ask one specific, low-effort question instead. Not what do you think, which everybody ignores, but which of these two would you actually try, which invites a one-word answer that still counts as a comment.",
          "Then reply to every comment in the first hour. Replies are engagement, they pull the original commenter back to the video, and they make the next person more likely to join in.",
        ],
      },
      {
        heading: "Mistakes that quietly cap your reach",
        body: [
          "Some of these are well known and still nearly universal.",
        ],
        bullets: [
          "Visible watermarks from other apps. TikTok demotes reposted content, and a CapCut or Instagram watermark is the easiest possible signal.",
          "Deleting underperforming videos. It does not help, and it destroys the record you need to learn from.",
          "Chasing every trend regardless of fit. Trend-jacking outside your niche brings viewers who will never come back.",
          "Changing topic every week. The system needs to work out who to show you to, and constant pivots reset that.",
          "Buying followers. It wrecks your ratio, and ratio is what brands look at.",
        ],
      },
      {
        heading: "What to measure",
        body: [
          "Views are the least useful number in your analytics because they are an outcome, not a lever. Track the things upstream of them.",
          "Retention graph first: where do people drop off. Then completion rate, then shares. Shares in particular are the strongest predictor of a video breaking out, because a share is someone spending their own social capital on you.",
          "Follower growth is worth logging weekly rather than daily, because daily numbers are mostly noise.",
        ],
      },
    ],
    theme: THEMES.tiktok,
  },
  {
    slug: "how-to-grow-on-instagram",
    title: "How to Grow on Instagram in 2026: What Still Works",
    heading: "How to grow on Instagram in 2026",
    description:
      "Reels for reach, carousels for saves, stories for retention. How the three formats do different jobs on Instagram, and how to use them together instead of posting at random.",
    published: "2026-08-09",
    readMinutes: 8,
    category: "Platform guides",
    keywords: [
      "how to grow on instagram",
      "instagram growth 2026",
      "instagram reels tips",
      "instagram algorithm",
      "get more followers on instagram",
    ],
    intro:
      "Instagram is really three products sharing an app, and they reward different things. Most accounts stall because they post one format and hope it does every job. It will not.",
    takeaways: [
      "Reels reach strangers. Carousels get saved. Stories keep the people you already have.",
      "Saves and shares outrank likes by a wide margin.",
      "Your first line of the caption is doing more work than the whole rest of it.",
      "Posting less but better usually raises reach, because reach is an average.",
    ],
    sections: [
      {
        heading: "The three formats do different jobs",
        body: [
          "Reels are the discovery engine. They are shown to people who do not follow you, which makes them the only reliable way to reach a new audience at any scale.",
          "Carousels are the save engine. A multi-slide post that teaches something concrete gets saved, and saves are weighted heavily. They rarely go viral, but they convert browsers into followers at a much higher rate.",
          "Stories are the retention engine. They reach almost nobody new, and that is the point. They are how the people who already follow you stay attached, and attachment is what turns an audience into something worth having.",
        ],
        callout:
          "A healthy week usually contains all three. Reels to be found, a carousel to be worth following, stories so the people who found you last month have not forgotten who you are.",
      },
      {
        heading: "Saves and shares are the real currency",
        body: [
          "A like costs nothing, and the platform prices it accordingly. A save means someone intends to return to your post. A share means they were willing to put their own name next to it. Both are far stronger signals.",
          "This changes what you should make. Opinions get likes. Reference material gets saved: checklists, step-by-step breakdowns, comparisons, things with numbers in them. If you want saves, make something a person would be annoyed to lose.",
        ],
        bullets: [
          "Give the post a reason to be revisited, not just read.",
          "Put the useful part in the image, not only the caption. People save images.",
          "End carousels with a summary slide. It is the most screenshotted slide you will make.",
        ],
      },
      {
        heading: "Captions: the first line is the whole game",
        body: [
          "Instagram truncates captions after roughly two lines. Everything past the more link is read by a small fraction of the people who saw the post, so the first line has to earn the expansion.",
          "Write it last. Draft the caption, then work out which sentence in it is the most interesting, and move that to the top.",
        ],
      },
      {
        heading: "Hashtags in 2026",
        body: [
          "Hashtags matter less than they did and far less than most guides claim. Instagram now reads your caption, your on-screen text and your audio to classify a post, and those signals dominate.",
          "They are still worth using, just stop treating them as a strategy. Eight to fifteen genuinely relevant tags beats thirty loose ones, which mostly attracts bots and tells the classifier nothing useful.",
        ],
      },
      {
        heading: "Why your reach dropped",
        body: [
          "Reach falling is usually one of three things, and almost never a shadowban.",
          "Either you posted more filler and dragged your average down, or you changed topic and the classifier no longer knows who to show you to, or you had one unusually good month and are now comparing against an outlier.",
          "Before assuming a penalty, check whether your recent posts are genuinely as good as the ones from the period you are comparing to. Usually they are not, and that is a fixable problem.",
        ],
      },
    ],
    theme: THEMES.instagram,
  },
  {
    slug: "first-1000-followers",
    title: "How to Get Your First 1,000 Followers (Without Buying Any)",
    heading: "How to get your first 1,000 followers",
    description:
      "The first thousand followers are the hardest and the most misunderstood. A realistic plan built on picking one platform, one topic and a cadence you can actually keep.",
    published: "2026-08-09",
    readMinutes: 7,
    category: "Growth",
    keywords: [
      "first 1000 followers",
      "how to get followers",
      "grow from zero followers",
      "social media for beginners",
      "gain followers organically",
    ],
    intro:
      "Nobody is coming to save your first hundred posts. The first thousand followers come from doing unglamorous things consistently while your work is not very good yet, which is exactly why most people never get there.",
    takeaways: [
      "One platform, one topic, for at least ninety days.",
      "Your first thirty posts are practice. Treat them as such.",
      "Reply to everything. Early on, conversation compounds faster than content.",
      "Bought followers make every later metric worse, permanently.",
    ],
    sections: [
      {
        heading: "Pick one platform and stay there",
        body: [
          "Spreading four posts a week across four platforms gives you one post a week on each, which is not enough to learn anything anywhere. Pick the one where your format works best and go deep.",
          "Short video suits TikTok. Visual and reference content suits Instagram. Long-form explanation suits YouTube. Text and opinion suit X and LinkedIn. Choose on format, not on which app you personally enjoy.",
        ],
        callout:
          "Cross-posting later is easy. Building an audience in four places at once is not. Get to a thousand somewhere first.",
      },
      {
        heading: "Narrow the topic further than feels comfortable",
        body: [
          "Fitness is not a topic, it is a category with millions of competitors. Kettlebell training for people with desk jobs is a topic. Narrow enough that someone can describe you in one sentence.",
          "Narrowness feels like it limits your ceiling. In practice it is the only way to get off the ground, because a specific promise is what makes a stranger follow. You can broaden once people are already listening.",
        ],
      },
      {
        heading: "The first thirty posts are practice",
        body: [
          "Almost nobody is good at this immediately, and the fastest way through is volume with attention. Publish, look at what happened, change one thing, publish again.",
          "Do not delete the early ones. They are the only record you have of what you tried, and the improvement curve is genuinely motivating to look back on.",
        ],
      },
      {
        heading: "Conversation compounds faster than content",
        body: [
          "At small scale, a thoughtful reply reaches a meaningful percentage of your potential audience. At large scale it does not. This is a real advantage of being small and it expires.",
          "Reply to every comment you get. Comment on accounts slightly bigger than yours, not with generic praise but with something that adds to the point. A good comment on a popular post can reach more people than your own post did.",
        ],
        bullets: [
          "Reply to every comment for the first hour after posting.",
          "Leave five substantive comments a day on adjacent accounts.",
          "Answer DMs. Early followers who feel seen become the people who share your work.",
        ],
      },
      {
        heading: "Why buying followers is worse than doing nothing",
        body: [
          "Purchased followers do not engage, which drags your engagement rate down permanently. That number is the first thing a brand checks, and a 30,000 follower account with 0.3% engagement is worth less than a 3,000 follower account with 5%.",
          "It also corrupts your own feedback loop. You can no longer tell whether a post did well, because your baseline is fake.",
        ],
      },
    ],
    theme: THEMES.growth,
  },
  {
    slug: "how-creators-make-money",
    title: "How Creators Actually Make Money in 2026",
    heading: "How creators actually make money",
    description:
      "A realistic breakdown of creator income: platform payouts, brand deals, affiliate, products and paid tasks. What each pays, when it starts, and what it takes.",
    published: "2026-08-09",
    readMinutes: 8,
    category: "Money",
    keywords: [
      "how creators make money",
      "creator income 2026",
      "make money on social media",
      "brand deal rates",
      "monetise social media",
    ],
    intro:
      "Creator income is less about audience size than most people assume and more about which revenue lines you have switched on. Plenty of accounts with 50,000 followers earn nothing, and plenty with 5,000 earn steadily.",
    takeaways: [
      "Platform payouts are the least reliable line and the hardest to start.",
      "Brand deals are priced on engagement and niche, not follower count alone.",
      "Affiliate income starts at any size and compounds with trust.",
      "Most sustainable creator income is several small lines, not one big one.",
    ],
    sections: [
      {
        heading: "Platform payouts",
        body: [
          "Every major platform now shares some ad revenue, and every one of them has thresholds you must clear first, typically a follower minimum plus a watch time minimum inside a rolling window.",
          "Treat this as a bonus rather than a plan. Rates vary enormously by region and topic, they change without notice, and the same view is worth very different amounts depending on who saw it. It is real money, but it is not money you can forecast.",
        ],
        callout:
          "Be sceptical of any specific per-thousand-views figure quoted without a niche and a country attached. The range is wide enough that an average is close to meaningless.",
      },
      {
        heading: "Brand deals",
        body: [
          "This is where most serious creator income comes from, and it starts far earlier than people expect. Brands increasingly prefer smaller accounts with tight, engaged audiences over large ones with diffuse reach.",
          "Pricing is driven by engagement rate, niche commercial value and usage rights, not by follower count on its own. A tight audience in a high-value niche can charge multiples of what a larger general account can.",
          "Usage rights are the term most creators give away for free without realising. Letting a brand run your video as a paid advert for six months is worth considerably more than a single post, and should be priced separately.",
        ],
        bullets: [
          "Know your engagement rate before any conversation about price.",
          "Price usage rights, exclusivity and duration as separate line items.",
          "Ask what the brand considers success. It tells you what the deal is worth to them.",
        ],
      },
      {
        heading: "Affiliate",
        body: [
          "Affiliate income has no threshold, which makes it the first line most creators can realistically switch on. You recommend something, someone buys through your link, you take a percentage.",
          "It rewards trust rather than reach, so it suits creators with small, attentive audiences. It also punishes indiscriminate promotion faster than anything else: recommend one thing you do not believe in and the audience stops clicking anything.",
        ],
      },
      {
        heading: "Your own products",
        body: [
          "Templates, presets, guides, courses and physical goods. The highest margin and the most work, and the only line you fully control.",
          "The common mistake is building the product first. Ask what your audience already asks you for. If the same question arrives ten times, that is the product.",
        ],
      },
      {
        heading: "Paid tasks and micro-earning",
        body: [
          "Platforms that pay for completing social actions sit at the entry level of creator income. The rates are modest by design and it will not replace a salary, but it starts immediately, requires no audience, and pays while you are building one.",
          "It works best as a floor rather than a ceiling: something that covers small costs during the months when nothing else is earning yet.",
        ],
      },
      {
        heading: "A realistic picture",
        body: [
          "Almost nobody makes a living from one line. The creators who earn consistently usually have three or four running at once, each of which would look unimpressive alone.",
          "That is also the sensible way to build it, because every individual line is fragile. Platform payouts change, brands cut budgets, products go quiet. Several small lines survive that; one big one does not.",
        ],
      },
    ],
    theme: THEMES.money,
  },
  {
    slug: "content-calendar-that-works",
    title: "How to Build a Content Calendar You Will Actually Keep",
    heading: "A content calendar you will actually keep",
    description:
      "Most content calendars fail in week three. A batching-based system built around content pillars and a cadence you can hold on a bad week.",
    published: "2026-08-09",
    readMinutes: 6,
    category: "Content",
    keywords: [
      "content calendar",
      "social media planning",
      "content pillars",
      "batch content creation",
      "posting schedule",
    ],
    intro:
      "Content calendars usually fail for the same reason diets do. They are designed for the most motivated version of you, and then real life arrives in week three.",
    takeaways: [
      "Set your cadence by your worst week, not your best one.",
      "Three to five content pillars stop the blank-page problem.",
      "Batch by task, not by post. It is dramatically faster.",
      "Keep a running idea list. Ideas are the actual bottleneck.",
    ],
    sections: [
      {
        heading: "Start from your worst week",
        body: [
          "Ask what you could still publish during a week when work is busy, you sleep badly and nothing goes to plan. That number is your cadence. For most people it is two or three posts, not seven.",
          "Publishing above your baseline when things go well is a bonus. Setting the baseline at your best week guarantees you will miss it, and missing it is what makes people quit.",
        ],
      },
      {
        heading: "Content pillars",
        body: [
          "Pick three to five recurring themes you can return to indefinitely. A fitness creator might use form breakdowns, gear, mistakes, client stories and quick sessions.",
          "Pillars solve the blank page. You are never deciding what to post from nothing, only which pillar is due and what this week's version of it is.",
        ],
        bullets: [
          "Each pillar should support at least twenty posts. If it cannot, it is a topic, not a pillar.",
          "Rotate them so no pillar dominates a month.",
          "Track which pillar performs. Usually one carries most of your growth.",
        ],
      },
      {
        heading: "Batch by task, not by post",
        body: [
          "Making one post start to finish, then the next, is the slowest possible method because you pay the setup cost every time.",
          "Batch by stage instead. Write six captions in one sitting. Film four videos in one session while the lighting is already right. Edit them together. The saving is large enough that it usually decides whether a schedule survives.",
        ],
        callout:
          "One filming session and one editing session a week is a realistic system for most people. Daily filming is not.",
      },
      {
        heading: "Keep a running idea list",
        body: [
          "The bottleneck is rarely time to make things. It is having something worth making when the time arrives.",
          "Keep one note. Add to it whenever someone asks you a question, whenever you disagree with something you read, whenever you learn something that took you too long to find. Never sit down to a blank page.",
        ],
      },
      {
        heading: "Review monthly, not daily",
        body: [
          "Daily numbers are noise and checking them constantly is corrosive. Once a month, look at what performed, which pillar carried it and what you want more of.",
          "Change one thing at a time. Changing format, topic and cadence together tells you nothing about which one worked.",
        ],
      },
    ],
    theme: THEMES.content,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function relatedGuides(slug: string, limit = 3): Guide[] {
  const current = getGuide(slug);
  const others = GUIDES.filter((g) => g.slug !== slug);
  if (!current) return others.slice(0, limit);
  // Same category first, then anything else.
  const sameCategory = others.filter((g) => g.category === current.category);
  const rest = others.filter((g) => g.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export const GUIDE_CATEGORIES = Array.from(
  new Set(GUIDES.map((g) => g.category))
);
