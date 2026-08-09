"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/loading-states";
import {
  Users, Award, Settings, Shield, Activity, Bell, Database, Key, Lock, BarChart,
  FileText, UserCog, CheckCircle, XCircle, Plus, Trash, Edit, Save, RefreshCcw,
  LogOut, Rocket, DollarSign, Eye, Check, X, ChevronDown, ChevronUp, Mail, Star,
  Flame, Megaphone, GraduationCap, Trophy, Link, Store,
  ChevronDown as ChevDown, ChevronUp as ChevUp,
} from "lucide-react";
import { Task, User } from "@shared/schema.mysql";

/** Ad placement management panel. Extracted from app/admin/page.tsx. */

interface AdPlacementAdmin {
  id: number;
  position: string;
  adCode: string;
  isActive: boolean;
  createdAt: string;
}

export function AdminAdsPanel() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdPlacementAdmin | null>(null);
  const [form, setForm] = useState({ adCode: "", position: "top", isActive: true });
  const [adToDelete, setAdToDelete] = useState<number | null>(null);

  const { data: ads, isLoading } = useQuery<AdPlacementAdmin[]>({
    queryKey: ["/api/admin/ads"],
  });

  const { data: qrLeads } = useQuery<{ id: number; email: string; originalUrl: string; createdAt: string }[]>({
    queryKey: ["/api/admin/tools/qr-leads"],
  });

  const { data: shortenedUrlList } = useQuery<{ id: number; shortCode: string; originalUrl: string; clicks: number; createdAt: string }[]>({
    queryKey: ["/api/admin/tools/urls"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = editing ? `/api/admin/ads/${editing.id}` : "/api/admin/ads";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save ad");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      toast({ title: editing ? "Ad updated" : "Ad created" });
      setOpen(false);
      setEditing(null);
      setForm({ adCode: "", position: "top", isActive: true });
    },
    onError: () => toast({ title: "Error", description: "Could not save ad", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      toast({ title: "Ad deleted" });
    },
    onError: () => toast({ title: "Error", description: "Could not delete ad", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] }),
    onError: () => toast({ title: "Error", description: "Could not toggle ad", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ adCode: "", position: "top", isActive: true });
    setOpen(true);
  };

  const openEdit = (ad: AdPlacementAdmin) => {
    setEditing(ad);
    setForm({ adCode: ad.adCode, position: ad.position, isActive: ad.isActive });
    setOpen(true);
  };

  const POSITIONS = ["top", "middle", "left", "right", "bottom", "all"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" /> Ad Placements
          </CardTitle>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Placement
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !ads || ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ad placements yet. Click "Add Placement" to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Code Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{ad.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[240px]">
                        {ad.adCode.slice(0, 60)}{ad.adCode.length > 60 ? "…" : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad.isActive ? "default" : "secondary"}>
                        {ad.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={ad.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: ad.id, isActive: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(ad)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => setAdToDelete(ad.id)} disabled={deleteMutation.isPending}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Shortened URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" /> Shortened URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!shortenedUrlList || shortenedUrlList.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No shortened URLs yet. Users who create short links from the Tools page appear here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Original URL</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortenedUrlList.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell className="font-mono text-sm font-medium">{url.shortCode}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[220px]">{url.originalUrl}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{url.clicks}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(url.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Email Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> QR Code Email Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!qrLeads || qrLeads.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No leads yet. Visitors who download QR codes from the Tools page appear here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Original URL</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrLeads.map((lead, i) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{lead.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.originalUrl}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Ad Placement" : "Create Ad Placement"}</DialogTitle>
            <DialogDescription>
              Paste a Google Ads or AdSense script snippet. It will be injected into the selected slot on the Tools page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Position</label>
              <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ad Code</label>
              <textarea
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Paste Google Ads or AdSense script here..."
                value={form.adCode}
                onChange={e => setForm(f => ({ ...f, adCode: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.adCode.trim()}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={adToDelete !== null} onOpenChange={(v) => { if (!v) setAdToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad Placement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ad placement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (adToDelete !== null) deleteMutation.mutate(adToDelete);
                setAdToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
