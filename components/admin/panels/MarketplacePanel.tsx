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

/** Marketplace moderation panel. Extracted from app/admin/page.tsx. */

interface AdminListingComment {
  id: number;
  listingId: number;
  userId: number;
  username: string;
  message: string;
  createdAt: string;
}

interface AdminListing {
  id: number;
  sellerId: number;
  sellerUsername: string;
  buyerId: number | null;
  buyerUsername: string | null;
  pointsAmount: number;
  note: string | null;
  status: "open" | "sold";
  soldAt: string | null;
  createdAt: string;
  comments: AdminListingComment[];
}

export function AdminMarketplacePanel() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: listings, isLoading } = useQuery<AdminListing[]>({
    queryKey: ["/api/admin/marketplace/listings"],
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/marketplace/listings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/listings"] });
      toast({ title: "Listing deleted" });
    },
    onError: () => toast({ title: "Error", description: "Could not delete listing", variant: "destructive" }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/marketplace/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/listings"] });
      toast({ title: "Comment deleted" });
    },
    onError: () => toast({ title: "Error", description: "Could not delete comment", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" /> Marketplace Listings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !listings || listings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No marketplace listings yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => (
                <Fragment key={listing.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{listing.id}</TableCell>
                    <TableCell>@{listing.sellerUsername}</TableCell>
                    <TableCell className="font-semibold">{listing.pointsAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={listing.status === "sold" ? "secondary" : "default"}>
                        {listing.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{listing.buyerUsername ? `@${listing.buyerUsername}` : ", "}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedId(expandedId === listing.id ? null : listing.id)}
                      >
                        {listing.comments.length}
                        {expandedId === listing.id ? <ChevUp className="w-3 h-3" /> : <ChevDown className="w-3 h-3" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteListingMutation.mutate(listing.id)}
                        disabled={deleteListingMutation.isPending}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === listing.id && (
                    <TableRow key={`${listing.id}-comments`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="p-4 space-y-2">
                          {listing.note && (
                            <p className="text-sm italic text-muted-foreground mb-3">Seller note: "{listing.note}"</p>
                          )}
                          {listing.comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No comments.</p>
                          ) : (
                            <div className="space-y-2">
                              {listing.comments.map((c) => (
                                <div key={c.id} className="flex items-start justify-between gap-3 p-2 rounded-lg bg-background border text-sm">
                                  <div>
                                    <span className="font-medium">@{c.username}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    <p className="mt-0.5 text-muted-foreground">{c.message}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive flex-shrink-0"
                                    onClick={() => deleteCommentMutation.mutate(c.id)}
                                    disabled={deleteCommentMutation.isPending}
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
