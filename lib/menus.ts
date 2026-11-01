/**
 * Member menus a superadmin can switch off (Admin → Menus). Mirrored in the
 * app at src/lib/menus.ts; keep the two lists in step.
 *
 * Stored in app_settings: three menus keep the feature flags they always had
 * (classroom_enabled etc.), the rest share one JSON key, menu_visibility,
 * e.g. {"marketplace":false}. A menu is on unless it's been turned off, so a
 * missing or unreadable setting never hides anything.
 *
 * Dashboard and Settings aren't listed: members always need a home screen and
 * a way to manage or delete their account.
 */
export interface MenuDef {
  key: string;
  label: string;
  description: string;
  /** Path prefixes that belong to this menu; a direct visit shows a "turned off" notice. */
  paths: string[];
  /** Older feature flag that controls this menu instead of menu_visibility. */
  flag?: string;
}

export const MENU_VISIBILITY_KEY = "menu_visibility";

export const MENUS: MenuDef[] = [
  { key: "tasks", label: "Tasks", description: "Task list and completing tasks", paths: ["/tasks"] },
  { key: "classroom", label: "Classroom", description: "Lessons and videos", paths: ["/classroom"], flag: "classroom_enabled" },
  { key: "rewards", label: "Rewards", description: "Badges, streaks and levels", paths: ["/rewards"] },
  { key: "referral", label: "Referral", description: "Invite links and referral rewards", paths: ["/referral"] },
  { key: "leaderboard", label: "Leaderboard", description: "Top members ranking", paths: ["/leaderboard"], flag: "leaderboard_enabled" },
  { key: "payments", label: "Payments", description: "Balance and withdrawal requests", paths: ["/payments"] },
  { key: "promote_me", label: "Promote Me", description: "Paid promotion requests", paths: ["/promote-me"], flag: "promote_me_enabled" },
  { key: "marketplace", label: "Marketplace", description: "Buying and selling points", paths: ["/marketplace"] },
  { key: "community", label: "Community", description: "Posts, comments and activity", paths: ["/feed"] },
  { key: "tools", label: "Tools", description: "Free tools like the QR generator", paths: ["/tools"] },
  // Menu entry only: public profile pages stay reachable.
  { key: "profile", label: "My Profile", description: "Link to your public profile", paths: [] },
  { key: "support", label: "Support", description: "Contact support form", paths: ["/support"] },
];

export function parseMenuVisibility(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** Whether a menu is on, from the public /api/settings map. */
export function menuEnabled(key: string, settings: Record<string, string> | undefined): boolean {
  const def = MENUS.find((m) => m.key === key);
  if (!def || !settings) return true;
  if (def.flag) return settings[def.flag] !== "false";
  return parseMenuVisibility(settings[MENU_VISIBILITY_KEY])[key] !== false;
}

/** The switched-off menu that owns this path, if any. */
export function disabledMenuForPath(pathname: string, settings: Record<string, string> | undefined): MenuDef | null {
  if (!settings) return null;
  for (const m of MENUS) {
    const owns = m.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (owns && !menuEnabled(m.key, settings)) return m;
  }
  return null;
}
