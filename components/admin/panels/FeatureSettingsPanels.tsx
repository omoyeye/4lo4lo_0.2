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

/** Feature-flag toggles and reward/limit settings. Extracted from app/admin/page.tsx. */

export function PromoteMeToggle() {
  const { data: settings, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();

  const isEnabled = settings?.promote_me_enabled !== "false";

  const handleToggle = async () => {
    try {
      const newValue = isEnabled ? "false" : "true";
      const response = await fetch("/api/admin/settings/promote_me_enabled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: newValue }),
      });

      if (response.ok) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({
          title: newValue === "true" ? "Promote Me Enabled" : "Promote Me Disabled",
          description: newValue === "true" 
            ? "Users can now access the Promote Me page" 
            : "The Promote Me page is now hidden from users",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update setting");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">Promote Me Page</h3>
          <p className="text-sm text-muted-foreground">
            {isEnabled 
              ? "Users can access the Promote Me feature" 
              : "Promote Me page is hidden from users"}
          </p>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          data-testid="promote-me-toggle"
        />
      )}
    </div>
  );
}

export function ClassroomToggle() {
  const { data: settings, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();

  const isEnabled = settings?.classroom_enabled !== "false";

  const handleToggle = async () => {
    try {
      const newValue = isEnabled ? "false" : "true";
      const response = await fetch("/api/admin/settings/classroom_enabled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: newValue }),
      });

      if (response.ok) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({
          title: newValue === "true" ? "Classroom Enabled" : "Classroom Disabled",
          description: newValue === "true"
            ? "Users can now access the Classroom page"
            : "The Classroom page is now hidden from users",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update setting");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">Classroom Page</h3>
          <p className="text-sm text-muted-foreground">
            {isEnabled
              ? "Users can access the Classroom feature"
              : "Classroom page is hidden from users"}
          </p>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          data-testid="classroom-toggle"
        />
      )}
    </div>
  );
}

export function MarketplaceSettingsPanel() {
  const { data: settings, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();
  const [limitValue, setLimitValue] = useState("3");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.max_open_listings) {
      setLimitValue(settings.max_open_listings);
    }
  }, [settings]);

  const handleSave = async () => {
    const parsed = parseInt(limitValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      toast({ title: "Invalid Value", description: "Limit must be between 1 and 50", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/max_open_listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: String(parsed) }),
      });
      if (response.ok) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        setEditing(false);
        toast({ title: "Setting Saved", description: `Users can now have up to ${parsed} open listings` });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update setting");
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save setting",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Marketplace</h3>
            <p className="text-sm text-muted-foreground">Configure the Points Marketplace settings</p>
          </div>
        </div>
      </div>
      <div className="border-t px-4 py-3 bg-muted/30 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Max open listings per user</p>
          <p className="text-xs text-muted-foreground">Maximum number of open listings a user can have at once (1–50)</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-6 w-12" />
          ) : editing ? (
            <>
              <Input
                type="number"
                min={1}
                max={50}
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                className="w-24 h-8 text-sm"
              />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">{limitValue}</span>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeaderboardSettingsPanel() {
  const { data: settings, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();
  const [limitValue, setLimitValue] = useState("50");
  const [editingLimit, setEditingLimit] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    if (settings?.leaderboard_limit) {
      setLimitValue(settings.leaderboard_limit);
    }
  }, [settings]);

  const isEnabled = settings?.leaderboard_enabled !== "false";

  const handleToggle = async () => {
    try {
      const newValue = isEnabled ? "false" : "true";
      const response = await fetch("/api/admin/settings/leaderboard_enabled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: newValue }),
      });
      if (response.ok) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({
          title: newValue === "true" ? "Leaderboard Enabled" : "Leaderboard Disabled",
          description: newValue === "true"
            ? "Users can now access the Leaderboard"
            : "The Leaderboard is now hidden from users",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update setting");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update setting",
        variant: "destructive",
      });
    }
  };

  const handleSaveLimit = async () => {
    const parsed = parseInt(limitValue, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 500) {
      toast({ title: "Invalid Value", description: "Limit must be between 1 and 500", variant: "destructive" });
      return;
    }
    setSavingLimit(true);
    try {
      const response = await fetch("/api/admin/settings/leaderboard_limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: String(parsed) }),
      });
      if (response.ok) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        setEditingLimit(false);
        toast({ title: "Limit Saved", description: `Leaderboard will show top ${parsed} users` });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update setting");
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save limit",
        variant: "destructive",
      });
    } finally {
      setSavingLimit(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-medium">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? "Users can access the Leaderboard" : "Leaderboard is hidden from users"}
            </p>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <Switch checked={isEnabled} onCheckedChange={handleToggle} data-testid="leaderboard-toggle" />
        )}
      </div>
      <div className="border-t px-4 py-3 bg-muted/30 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Max users shown</p>
          <p className="text-xs text-muted-foreground">Number of top users displayed (1–500)</p>
        </div>
        <div className="flex items-center gap-2">
          {editingLimit ? (
            <>
              <Input
                type="number"
                min={1}
                max={500}
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                className="w-24 h-8 text-sm"
                data-testid="leaderboard-limit-input"
              />
              <Button size="sm" onClick={handleSaveLimit} disabled={savingLimit}>
                {savingLimit ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingLimit(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">{limitValue}</span>
              <Button size="sm" variant="outline" onClick={() => setEditingLimit(true)}>Edit</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function RewardsSettingsPanel() {
  const { data: settings, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    referral_rate_per_person: "0.25",
    minimum_referrals_to_claim: "20",
    points_to_currency_rate: "0.001",
    minimum_points_to_withdraw: "5000",
    points_per_task_completion: "10",
    referral_bonus_points: "50"
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        referral_rate_per_person: settings.referral_rate_per_person || "0.25",
        minimum_referrals_to_claim: settings.minimum_referrals_to_claim || "20",
        points_to_currency_rate: settings.points_to_currency_rate || "0.001",
        minimum_points_to_withdraw: settings.minimum_points_to_withdraw || "5000",
        points_per_task_completion: settings.points_per_task_completion || "10",
        referral_bonus_points: settings.referral_bonus_points || "50"
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToUpdate = Object.entries(localSettings);
      
      for (const [key, value] of settingsToUpdate) {
        const response = await fetch(`/api/admin/settings/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ value }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update ${key}`);
        }
      }

      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setEditMode(false);
      toast({
        title: "Settings Saved",
        description: "Rewards and points settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const settingsConfig = [
    {
      key: "referral_rate_per_person",
      label: "Referral Rate Per Person",
      description: "Amount earned per successful referral (in currency)",
      prefix: "$",
      type: "number",
      step: "0.01"
    },
    {
      key: "minimum_referrals_to_claim",
      label: "Minimum Referrals to Claim",
      description: "Number of referrals required before claiming rewards",
      type: "number",
      step: "1"
    },
    {
      key: "points_to_currency_rate",
      label: "Points to Currency Rate",
      description: "Conversion rate (e.g., 0.001 means 1000 points = $1)",
      prefix: "$",
      type: "number",
      step: "0.0001"
    },
    {
      key: "minimum_points_to_withdraw",
      label: "Minimum Points to Withdraw",
      description: "Minimum points required for withdrawal requests",
      type: "number",
      step: "100"
    },
    {
      key: "points_per_task_completion",
      label: "Points Per Task Completion",
      description: "Base points awarded when completing a task",
      type: "number",
      step: "1"
    },
    {
      key: "referral_bonus_points",
      label: "Referral Bonus Points",
      description: "Bonus points when a referred user signs up",
      type: "number",
      step: "1"
    }
  ];

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <Award className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Rewards & Points Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure referral rewards and point conversion rates
            </p>
          </div>
        </div>
        <Button 
          variant={editMode ? "outline" : "default"}
          size="sm"
          onClick={() => editMode ? setEditMode(false) : setEditMode(true)}
          data-testid="rewards-settings-edit-btn"
        >
          {editMode ? "Cancel" : "Edit Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsConfig.map((config) => (
          <div key={config.key} className="p-4 bg-muted/30 rounded-lg">
            <label className="text-sm font-medium block mb-1">{config.label}</label>
            <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
            {editMode ? (
              <div className="flex items-center gap-2">
                {config.prefix && <span className="text-muted-foreground">{config.prefix}</span>}
                <Input
                  type={config.type}
                  step={config.step}
                  value={localSettings[config.key as keyof typeof localSettings]}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    [config.key]: e.target.value
                  }))}
                  className="max-w-[150px]"
                  data-testid={`input-${config.key}`}
                />
              </div>
            ) : (
              <div className="text-lg font-semibold">
                {config.prefix}{localSettings[config.key as keyof typeof localSettings]}
              </div>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <div className="mt-6 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (settings) {
                setLocalSettings({
                  referral_rate_per_person: settings.referral_rate_per_person || "0.25",
                  minimum_referrals_to_claim: settings.minimum_referrals_to_claim || "20",
                  points_to_currency_rate: settings.points_to_currency_rate || "0.001",
                  minimum_points_to_withdraw: settings.minimum_points_to_withdraw || "5000",
                  points_per_task_completion: settings.points_per_task_completion || "10",
                  referral_bonus_points: settings.referral_bonus_points || "50"
                });
              }
              setEditMode(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            data-testid="save-rewards-settings-btn"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
