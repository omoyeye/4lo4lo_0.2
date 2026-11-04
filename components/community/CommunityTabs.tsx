"use client";

import { useState, type ReactNode } from "react";
import { Activity, MessagesSquare, Users } from "lucide-react";
import { PageHeader, Pills } from "@/components/member/kit";
import { CommunityPosts } from "./Posts";

/** Lives here because a server page can't pass an icon component to the client-side PageHeader. */
export function CommunityHeader() {
  return <PageHeader icon={Users} tone="pink" title="Community" description="Share tips and wins, and see what other creators are up to." />;
}

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
