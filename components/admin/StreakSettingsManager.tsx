"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash, Save } from "lucide-react";

interface Milestone {
  streak: number;
  bonusPoints: number;
}

interface StreakSettings {
  milestones: Milestone[];
}

export default function StreakSettingsManager() {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const { data, isLoading } = useQuery<StreakSettings>({
    queryKey: ["/api/admin/streak-settings"],
  });

  useEffect(() => {
    if (data?.milestones) setMilestones(data.milestones);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (settings: StreakSettings) => apiRequest("POST", "/api/admin/streak-settings", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/streak-settings"] });
      toast({ title: "Streak settings saved" });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  function addMilestone() {
    setMilestones(ms => [...ms, { streak: 1, bonusPoints: 0 }]);
  }

  function removeMilestone(idx: number) {
    setMilestones(ms => ms.filter((_, i) => i !== idx));
  }

  function updateMilestone(idx: number, field: keyof Milestone, val: number) {
    setMilestones(ms => ms.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  }

  function handleSave() {
    const sorted = [...milestones].sort((a, b) => a.streak - b.streak);
    saveMutation.mutate({ milestones: sorted });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Streak Milestone Bonuses</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addMilestone}><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Award bonus points when a user's login streak reaches these day milestones. Milestones are checked each time a user logs in.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No milestones configured. Add one above.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-sm font-medium text-muted-foreground px-1">
              <span>Streak (days)</span>
              <span>Bonus Points</span>
              <span />
            </div>
            {milestones.map((m, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  value={m.streak}
                  onChange={e => updateMilestone(idx, "streak", parseInt(e.target.value) || 1)}
                />
                <Input
                  type="number"
                  min={0}
                  value={m.bonusPoints}
                  onChange={e => updateMilestone(idx, "bonusPoints", parseInt(e.target.value) || 0)}
                />
                <Button size="sm" variant="destructive" onClick={() => removeMilestone(idx)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
