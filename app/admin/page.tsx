"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { isValidSection, isSuperadminSection, DEFAULT_SECTION, ADMIN_SECTIONS } from "@/components/admin/AdminNav";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TeamSection } from "@/components/admin/sections/TeamSection";
import { ActivitySection } from "@/components/admin/sections/ActivitySection";
import { BrandSection } from "@/components/admin/sections/BrandSection";
import { EmptyState, PageHeader } from "@/components/admin/kit";
import { OverviewSection } from "@/components/admin/sections/OverviewSection";
import { UsersSection } from "@/components/admin/sections/UsersSection";
import { TasksSection } from "@/components/admin/sections/TasksSection";
import { PlansSection, RequestsSection } from "@/components/admin/sections/PromotionSections";
import { TaskClicksSection, SystemAnalyticsSection } from "@/components/admin/sections/InsightsSections";
import { SettingsSection } from "@/components/admin/sections/SettingsSection";
import { ProofsSection } from "@/components/admin/sections/ProofsSection";
import { FlagsSection } from "@/components/admin/sections/FlagsSection";
import PaymentRequests from "@/components/admin/PaymentRequests";
import EmailCenter from "@/components/admin/EmailCenter";
import ClassroomManager from "@/components/admin/ClassroomManager";
import BadgeManager from "@/components/admin/BadgeManager";
import StreakSettingsManager from "@/components/admin/StreakSettingsManager";
import ReferralTierManager from "@/components/admin/ReferralTierManager";
import { AdminMarketplacePanel } from "@/components/admin/panels/MarketplacePanel";
import { AdminAdsPanel } from "@/components/admin/panels/AdsPanel";

/** Older panels that carry their own card title get the shared page header on top. */
function Legacy({ id, description, children }: { id: string; description?: string; children: ReactNode }) {
  const meta = ADMIN_SECTIONS.find((s) => s.id === id);
  return (
    <div className="space-y-6">
      {meta && <PageHeader icon={meta.icon} title={meta.label} description={description ?? meta.hint} />}
      {children}
    </div>
  );
}

const SECTIONS: Record<string, () => ReactNode> = {
  overview: () => <OverviewSection />,
  users: () => <UsersSection />,
  admins: () => <TeamSection />,
  referralTiers: () => <Legacy id="referralTiers"><ReferralTierManager /></Legacy>,
  tasks: () => <TasksSection />,
  proofs: () => <ProofsSection />,
  classroom: () => <Legacy id="classroom"><ClassroomManager /></Legacy>,
  payments: () => <PaymentRequests />,
  requests: () => <RequestsSection />,
  promotions: () => <PlansSection />,
  badges: () => <Legacy id="badges"><BadgeManager /></Legacy>,
  streakSettings: () => <Legacy id="streakSettings"><StreakSettingsManager /></Legacy>,
  marketplace: () => <Legacy id="marketplace"><AdminMarketplacePanel /></Legacy>,
  ads: () => <Legacy id="ads"><AdminAdsPanel /></Legacy>,
  analytics: () => <TaskClicksSection />,
  systemAnalytics: () => <SystemAnalyticsSection />,
  flags: () => <FlagsSection />,
  activity: () => <ActivitySection />,
  brand: () => <BrandSection />,
  email: () => <EmailCenter />,
  system: () => <SettingsSection />,
};

export default function Page() {
  // Auth guard and admin chrome are applied by app/admin/layout.tsx. The active
  // section is URL state (?section=) so views are linkable and survive refresh.
  const searchParams = useSearchParams();
  const raw = searchParams.get("section");
  const section = isValidSection(raw) ? (raw as string) : DEFAULT_SECTION;
  const { user } = useAuth();
  // The API refuses these for admins anyway (requireSuperadmin); this just
  // avoids showing a screen full of "Forbidden" errors.
  if (isSuperadminSection(section) && user?.role !== "superadmin") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Superadmins only"
        description="Payouts, settings, bulk email and the admin team are managed by a superadmin. Ask one if you need something changed here."
      />
    );
  }
  const render = SECTIONS[section] ?? SECTIONS[DEFAULT_SECTION];
  return <div key={section}>{render()}</div>;
}
