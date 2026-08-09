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

/** Admin directory CRUD. Extracted from app/admin/page.tsx. */

export function AdminManagementPanel() {
  const { toast } = useToast();
  const { data: admins, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/admins"],
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "superadmin"
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin created successfully" });
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin updated successfully" });
      setIsEditOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin deleted successfully" });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="bg-card p-6 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
            <UserCog className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Admin Management</h3>
            <p className="text-sm text-muted-foreground">Manage admin and superadmin accounts</p>
          </div>
        </div>
        <Button onClick={() => {
          setFormData({ username: "", email: "", password: "", role: "admin" });
          setIsCreateOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins?.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell className="font-medium">{admin.username}</TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell>
                <Badge variant={admin.role === 'superadmin' ? 'default' : 'secondary'}>
                  {admin.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={admin.status === 'active' ? 'outline' : 'destructive'} className="text-green-600 border-green-200 bg-green-50">
                  {admin.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedAdmin(admin);
                  setFormData({ username: admin.username, email: admin.email, password: "", role: admin.role });
                  setIsEditOpen(true);
                }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  if (confirm("Are you sure you want to delete this admin?")) {
                    deleteAdminMutation.mutate(admin.id);
                  }
                }}>
                  <Trash className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createAdminMutation.mutate(formData)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password (leave blank to keep current)</label>
              <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateAdminMutation.mutate({ id: selectedAdmin.id, data: formData })}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

