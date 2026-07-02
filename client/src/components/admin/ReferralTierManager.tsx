import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type ReferralTier = {
  id: number;
  label: string;
  minReferrals: number;
  maxReferrals: number | null;
  multiplier: string;
  createdAt: string;
};

type FormData = {
  label: string;
  minReferrals: number;
  maxReferrals: number | null;
  multiplier: string;
};

const emptyForm: FormData = {
  label: "",
  minReferrals: 1,
  maxReferrals: null,
  multiplier: "1.00",
};

export default function ReferralTierManager() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingTier, setEditingTier] = useState<ReferralTier | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: tiers = [], isLoading } = useQuery<ReferralTier[]>({
    queryKey: ["/api/admin/referral-tiers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-tiers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/admin/referral-tiers", {
        ...data,
        maxReferrals: data.maxReferrals === null || data.maxReferrals === 0 ? null : data.maxReferrals,
        multiplier: data.multiplier,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tier Created", description: "The referral tier has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referral-tiers"] });
      setFormOpen(false);
      setFormData(emptyForm);
    },
    onError: () => toast({ title: "Error", description: "Failed to create tier.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormData> }) => {
      const res = await apiRequest("PATCH", `/api/admin/referral-tiers/${id}`, {
        ...data,
        maxReferrals: data.maxReferrals === null || data.maxReferrals === 0 ? null : data.maxReferrals,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tier Updated", description: "Referral tier has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referral-tiers"] });
      setFormOpen(false);
      setEditingTier(null);
      setFormData(emptyForm);
    },
    onError: () => toast({ title: "Error", description: "Failed to update tier.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/referral-tiers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Tier Deleted", description: "Referral tier has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referral-tiers"] });
      setDeleteConfirmId(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete tier.", variant: "destructive" }),
  });

  function openCreate() {
    setEditingTier(null);
    setFormData(emptyForm);
    setFormOpen(true);
  }

  function openEdit(tier: ReferralTier) {
    setEditingTier(tier);
    setFormData({
      label: tier.label,
      minReferrals: tier.minReferrals,
      maxReferrals: tier.maxReferrals,
      multiplier: tier.multiplier,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!formData.label.trim()) {
      toast({ title: "Validation Error", description: "Label is required.", variant: "destructive" });
      return;
    }
    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function multiplierColor(m: string) {
    const v = parseFloat(m);
    if (v >= 2) return "bg-yellow-500/20 text-yellow-600";
    if (v >= 1.5) return "bg-blue-500/20 text-blue-600";
    return "bg-muted text-muted-foreground";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Referral Tiers</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Define reward multiplier brackets based on referral count
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tier
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tiers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No referral tiers configured. Add one to enable tiered rewards.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Min Referrals</TableHead>
                <TableHead>Max Referrals</TableHead>
                <TableHead>Multiplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.label}</TableCell>
                  <TableCell>{tier.minReferrals}</TableCell>
                  <TableCell>{tier.maxReferrals ?? "∞ (unlimited)"}</TableCell>
                  <TableCell>
                    <Badge className={multiplierColor(tier.multiplier)}>
                      {parseFloat(tier.multiplier).toFixed(2)}×
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(tier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteConfirmId(tier.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditingTier(null); setFormData(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit Referral Tier" : "Add Referral Tier"}</DialogTitle>
            <DialogDescription>
              Define a referral count range and the reward multiplier applied to users in this bracket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tier Label</label>
              <Input
                placeholder="e.g. Bronze, Silver, Gold"
                value={formData.label}
                onChange={(e) => setFormData(p => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Min Referrals</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.minReferrals}
                  onChange={(e) => setFormData(p => ({ ...p, minReferrals: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Referrals (blank = unlimited)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="unlimited"
                  value={formData.maxReferrals ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData(p => ({ ...p, maxReferrals: v === "" ? null : parseInt(v) || null }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Multiplier (e.g. 1.50 = 1.5× reward)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.multiplier}
                onChange={(e) => setFormData(p => ({ ...p, multiplier: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied to the base referral rate per person. 1.00 = no bonus, 2.00 = double reward.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTier ? "Save Changes" : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Referral Tier</DialogTitle>
            <DialogDescription>
              Are you sure? Users currently at this tier will fall back to the base rate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
