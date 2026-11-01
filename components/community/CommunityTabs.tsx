"use client";

import { useState, type ReactNode } from "react";
import { Activity, MessagesSquare } from "lucide-react";
import { Pills } from "@/components/member/kit";
import { CommunityPosts } from "./Posts";

/** Posts (default) and the existing activity feed, for signed-in members. */
export function CommunityTabs({ activity, canModerate }: { activity: ReactNode; canModerate: boolean }) {
  const [tab, setTab] = useState<"posts" | "activity">("posts");
  return (
    <div className="space-y-5">
      <Pills
        value={tab}
        onChange={setTab}
        className="w-fit"
        options={[
          { value: "posts", label: <><MessagesSquare className="h-4 w-4" /> Posts</> },
          { value: "activity", label: <><Activity className="h-4 w-4" /> Activity</> },
        ]}
      />
      {tab === "posts" ? <CommunityPosts canModerate={canModerate} /> : activity}
    </div>
  );
}
