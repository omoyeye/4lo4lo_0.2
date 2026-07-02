# GrowSocial Design Guidelines

## Design Approach

**Reference-Based Hybrid**: Drawing from Duolingo's gamification aesthetics, Linear's modern minimalism, and Notion's clean information hierarchy. This platform balances engagement-driven design with professional utility.

**Core Principles**:
- Gamification with sophistication - rewards feel valuable, not gimmicky
- Progress visibility - users always see their advancement
- Task clarity - actions are obvious and frictionless
- Professional credibility - builds trust for a reward platform

---

## Typography System

**Font Stack**: 
- Primary: 'Inter' (Google Fonts) - clean, modern sans-serif
- Accent: 'Space Grotesk' (Google Fonts) - headings and numbers

**Hierarchy**:
- Hero Headlines: Space Grotesk, 56px/64px, 700 weight
- Section Headers: Space Grotesk, 36px/44px, 600 weight
- Dashboard Titles: Inter, 24px/32px, 600 weight
- Body Text: Inter, 16px/24px, 400 weight
- Task Descriptions: Inter, 14px/20px, 400 weight
- Stat Numbers: Space Grotesk, 48px/56px, 700 weight (point displays)
- Button Text: Inter, 15px/20px, 500 weight
- Microcopy/Labels: Inter, 13px/18px, 500 weight

---

## Layout System

**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Tight spacing: p-2, gap-2 (task card internals)
- Standard: p-4, gap-4 (component padding)
- Generous: p-8, gap-8 (section spacing)
- Section breaks: py-16, py-24 (between major areas)

**Grid System**:
- Dashboard: 12-column grid with 24px gutters
- Task cards: 1-column mobile, 2-column tablet (md:), 3-column desktop (lg:)
- Stats/Rewards: 2-column mobile, 4-column desktop

**Container Widths**:
- Max content: max-w-7xl (1280px)
- Dashboard panels: max-w-6xl (1152px)
- Forms/Task details: max-w-2xl (672px)

---

## Component Library

### Navigation Header
- Fixed top navigation with backdrop blur effect
- Logo left, main nav center, user avatar/points right
- Height: 64px with subtle bottom border
- Displays current point balance prominently with coin icon
- Mobile: Hamburger menu with slide-in drawer

### Hero Section (Landing Page)
- Full-width, 85vh height
- Two-column layout: Left 60% content, Right 40% visual
- Gradient background overlay on hero image
- Primary CTA button with blur background effect, secondary text link
- Floating stats cards overlaying image (e.g., "50K+ Tasks Completed", "₹2M+ Rewards Earned")
- Include animated point counter effect for stats

### Dashboard Layout
- Sidebar navigation (240px width) with collapsible mobile drawer
- Main content area with dashboard grid
- Top stats bar: 4 metric cards (Points Balance, Tasks Completed, Referrals, Rank)
- Each stat card: Large number display, icon, percentage change indicator

### Task Cards
- Card-based design with hover lift effect (subtle shadow increase)
- Task thumbnail/platform icon top-left
- Task title, description (2-line clamp), platform badge
- Bottom row: Point value (large, prominent) + Difficulty badge + Time estimate
- Progress bar for ongoing tasks
- Quick action button: "Start Task" or "Claim Rewards"
- Status indicators: Available, In Progress, Completed (color-coded borders)

### Reward Cards
- Image-based cards with gradient overlays
- Product/reward image, title, point cost
- "Redeem" button with point icon
- Stock availability indicator
- Category filtering tabs above grid

### Referral Section
- Unique referral code in prominent display box with copy button
- Referral link generator with social share buttons
- Referral stats grid: Total Referrals, Active Referrals, Bonus Earned
- Referral activity timeline showing recent signups
- Tiered reward structure visualization (progress bars for next tier)

### Progress Indicators
- Circular progress for profile completion
- Linear bars for task completion
- Point accumulation charts (line graph with gradient fill)
- Level/rank progression ladder visualization

### Modals & Overlays
- Task detail modal: Full task requirements, step-by-step instructions, verification process
- Reward confirmation: Preview before redemption
- Achievement unlocks: Celebratory modal with confetti animation
- Center-aligned, max-w-2xl, backdrop blur

### Forms
- Input fields: 48px height, rounded corners, focus ring in purple
- Labels above inputs, helper text below
- Validation states with inline icons
- File upload for task verification with drag-drop zone
- Form sections grouped with subtle dividers

### Buttons
Primary: Purple gradient (#8B5CF6 to darker), white text, rounded-lg, px-6 py-3
Secondary: Purple outline, purple text, transparent background
Tertiary: Ghost style, purple text, no border
Disabled: Reduced opacity, no interaction
All buttons include smooth scale on press (active:scale-95)

### Notifications & Toasts
- Top-right corner, slide-in animation
- Success (green accent), Warning (amber), Error (red), Info (purple)
- Dismiss button, auto-dismiss after 5 seconds
- Icon + message + optional action link

### Empty States
- Centered illustration with message
- "No tasks yet" / "Complete tasks to earn rewards"
- Primary action CTA to remedy state
- Friendly, encouraging copy

---

## Animations & Interactions

**Micro-interactions** (use sparingly):
- Task card hover: Subtle lift (translateY -2px), shadow increase
- Button press: Scale down to 0.95
- Point counter: Number increment animation when earning
- Achievement unlock: Confetti burst (canvas-based)
- Progress bars: Smooth width transitions (0.3s ease)
- Stat cards: Pulsing glow effect on new achievements

**Page Transitions**: None - instant navigation preferred for dashboard app

**Loading States**: 
- Skeleton screens for task/reward grids
- Spinner for actions (claiming rewards, submitting tasks)

---

## Images Section

**Hero Image**: 
- Large hero image spanning right 40% of hero section, extending slightly beyond viewport right edge
- Content: Diverse group of people using phones/laptops with floating social media icons, point symbols, and reward imagery overlaid
- Treatment: Subtle purple gradient overlay (opacity 0.2) blending with background
- Dimensions: Minimum 1200x800px, optimized for retina displays

**Dashboard Illustrations**:
- Empty state illustrations for each section (no tasks, no rewards, no referrals)
- Style: Line-art illustrations with purple accent color
- Placement: Center of empty content areas

**Reward Product Images**:
- High-quality product photography for reward catalog
- Consistent aspect ratio: 4:3
- White or subtle gradient backgrounds
- Minimum 600x450px

**Task Platform Icons**:
- Social media platform logos (Instagram, Twitter, YouTube, etc.)
- Sized 32x32px for task cards, 48x48px for task details
- Consistent style treatment across all icons

**Achievement Badges**:
- Custom illustrated badges for milestones
- Metallic/gradient treatment (bronze, silver, gold tiers)
- 128x128px base size with SVG format preferred

---

## Accessibility & Responsiveness

**Mobile-First Approach**:
- Stacked single-column layouts below 768px
- Bottom navigation for primary actions on mobile
- Collapsible sidebar becomes drawer
- Touch-friendly tap targets (minimum 44x44px)

**Contrast Requirements**:
- Text on backgrounds meets WCAG AA standards
- Interactive elements have clear focus states
- Status indicators use icons + color (not color alone)

**Keyboard Navigation**:
- Logical tab order through interactive elements
- Visible focus indicators on all interactive components
- Modal traps focus, Esc to close