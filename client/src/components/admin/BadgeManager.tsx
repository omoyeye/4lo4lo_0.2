import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash } from "lucide-react";

interface Badge {
  id: number;
  key: string;
  title: string;
  description: string;
  iconName: string;
  condition: { type: string; threshold: number };
  pointsBonus: number;
}

type BadgeForm = Omit<Badge, "id">;

const emptyForm: BadgeForm = {
  key: "",
  title: "",
  description: "",
  iconName: "star",
  condition: { type: "tasks_completed", threshold: 1 },
  pointsBonus: 10,
};

export default function BadgeManager() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm] = useState<BadgeForm>(emptyForm);

  const { data: badges = [], isLoading } = useQuery<Badge[]>({
    queryKey: ["/api/admin/badges"],
  });

  const createMutation = useMutation({
    mutationFn: (data: BadgeForm) => apiRequest("POST", "/api/admin/badges", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] }); setOpen(false); toast({ title: "Badge created" }); },
    onError: () => toast({ title: "Failed to create badge", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BadgeForm> }) => apiRequest("PATCH", `/api/admin/badges/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] }); setOpen(false); toast({ title: "Badge updated" }); },
    onError: () => toast({ title: "Failed to update badge", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/badges/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/badges"] }); toast({ title: "Badge deleted" }); },
    onError: () => toast({ title: "Failed to delete badge", variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(badge: Badge) {
    setEditing(badge);
    setForm({ key: badge.key, title: badge.title, description: badge.description, iconName: badge.iconName, condition: badge.condition, pointsBonus: badge.pointsBonus });
    setOpen(true);
  }

  function handleSave() {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Badge Management</CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Badge</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading badges…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Bonus Pts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges.map(badge => (
                <TableRow key={badge.id}>
                  <TableCell className="font-mono text-xs">{badge.key}</TableCell>
                  <TableCell>{badge.title}</TableCell>
                  <TableCell className="text-xs">{badge.condition.type} ≥ {badge.condition.threshold}</TableCell>
                  <TableCell>+{badge.pointsBonus}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(badge)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(badge.id)} disabled={deleteMutation.isPending}><Trash className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Badge" : "Create Badge"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Key (unique identifier)</label>
              <Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. task_10" /></div>
            <div><label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Badge title" /></div>
            <div><label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" /></div>
            <div><label className="text-sm font-medium">Icon Name (lucide)</label>
              <Input value={form.iconName} onChange={e => setForm(f => ({ ...f, iconName: e.target.value }))} placeholder="e.g. star, flame" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-sm font-medium">Condition Type</label>
                <Input value={form.condition.type} onChange={e => setForm(f => ({ ...f, condition: { ...f.condition, type: e.target.value } }))} placeholder="tasks_completed" /></div>
              <div><label className="text-sm font-medium">Threshold</label>
                <Input type="number" value={form.condition.threshold} onChange={e => setForm(f => ({ ...f, condition: { ...f.condition, threshold: parseInt(e.target.value) || 1 } }))} /></div>
            </div>
            <div><label className="text-sm font-medium">Bonus Points</label>
              <Input type="number" value={form.pointsBonus} onChange={e => setForm(f => ({ ...f, pointsBonus: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save Changes" : "Create Badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
