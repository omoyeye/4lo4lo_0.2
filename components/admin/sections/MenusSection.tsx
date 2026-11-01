"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { LayoutList, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { adminFetch, PageHeader, Panel, StatusPill } from "@/components/admin/kit";
import { MENU_VISIBILITY_KEY, MENUS, menuEnabled, parseMenuVisibility, type MenuDef } from "@/lib/menus";

/** Superadmin switches for the member menus on the website and the app (lib/menus.ts). */
export function MenusSection() {
  const { toast } = useToast();
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });

  const save = useMutation({
    mutationFn: ({ menu, on }: { menu: MenuDef; on: boolean }) => {
      // Classroom, Leaderboard and Promote Me keep their original flags so
      // the switches in Settings and here stay the same switch.
      if (menu.flag) {
        return adminFetch(`/api/admin/settings/${menu.flag}`, { method: "PUT", json: { value: String(on) } });
      }
      const next = { ...parseMenuVisibility(settings?.[MENU_VISIBILITY_KEY]) };
      if (on) delete next[menu.key];
      else next[menu.key] = false;
      return adminFetch(`/api/admin/settings/${MENU_VISIBILITY_KEY}`, {
        method: "PUT",
        json: { value: JSON.stringify(next), description: "Member menus switched off in Admin → Menus" },
      });
    },
    onSuccess: (_d, { menu, on }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: `${menu.label} ${on ? "turned on" : "turned off"}`,
        description: on ? "Members can see it again on the website and the app." : "Hidden from members on the website and the app. Admins can still open it.",
      });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const offCount = settings ? MENUS.filter((m) => !menuEnabled(m.key, settings)).length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutList}
        title="Menus"
        description="Turn member menus on or off. A menu that's off disappears from the website and the app, and its page shows a 'turned off' notice. Admins still see everything."
      />

      <Panel
        title="Member menus"
        description={settings ? (offCount ? `${offCount} turned off` : "All menus are on") : "Loading…"}
      >
        <div className="divide-y">
          {MENUS.map((m) => {
            const on = menuEnabled(m.key, settings);
            return (
              <div key={m.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{m.label}</p>
                    <StatusPill status={on ? "active" : "pending"} label={on ? "On" : "Off"} />
                  </div>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </div>
                <Switch
                  checked={on}
                  disabled={!settings || save.isPending}
                  onCheckedChange={(v) => save.mutate({ menu: m, on: v })}
                  aria-label={`${m.label} menu`}
                />
              </div>
            );
          })}
          {[
            { label: "Dashboard", why: "Members' home screen" },
            { label: "Settings", why: "Members need it to manage or delete their account" },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-4 py-3.5 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium">{m.label}</p>
                <p className="text-sm text-muted-foreground">{m.why}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Always on
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
