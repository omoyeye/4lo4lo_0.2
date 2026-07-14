"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Plus, MessageCircle, ShoppingBag, User, Clock, CheckCircle2, SlidersHorizontal, X, Trash2, LayoutGrid, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Sidebar from "@/components/layout/Sidebar";
import { useAppSettings } from "@/contexts/AppSettingsContext";

type StatusFilter = "all" | "open" | "sold";

interface ListingComment {
  id: number;
  listingId: number;
  userId: number;
  username: string;
  message: string;
  createdAt: string;
}

interface Listing {
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
  comments: ListingComment[];
}

function CreateListingCard({ userPoints, openListingsCount, maxOpenListings }: { userPoints: number; openListingsCount: number; maxOpenListings: number }) {
  const { toast } = useToast();
  const [pointsAmount, setPointsAmount] = useState("");
  const [note, setNote] = useState("");
  const atLimit = openListingsCount >= maxOpenListings;

  const mutation = useMutation({
    mutationFn: async (data: { pointsAmount: number; note?: string }) => {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create listing");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setPointsAmount("");
      setNote("");
      toast({ title: "Listing created", description: "Your points listing is now live." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount < 1) {
      toast({ title: "Invalid amount", description: "Enter a positive number of points.", variant: "destructive" });
      return;
    }
    if (amount > userPoints) {
      toast({ title: "Insufficient points", description: "You cannot list more points than your balance.", variant: "destructive" });
      return;
    }
    mutation.mutate({ pointsAmount: amount, note: note.trim() || undefined });
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="w-5 h-5 text-primary" />
          Create a Listing
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Listing slots indicator */}
        <div className={`rounded-lg px-3 py-2 mb-4 text-sm ${
          atLimit
            ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800"
            : "bg-muted/40 border border-border"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`flex items-center gap-2 font-medium ${atLimit ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"}`}>
              {atLimit ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <LayoutGrid className="w-4 h-4 shrink-0 text-primary" />
              )}
              <span>{openListingsCount} / {maxOpenListings} listing slots used</span>
            </div>
            {!atLimit && (
              <span className="text-xs text-muted-foreground">
                {maxOpenListings - openListingsCount} slot{maxOpenListings - openListingsCount !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                atLimit
                  ? "bg-red-500"
                  : openListingsCount / maxOpenListings >= 0.6
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((openListingsCount / maxOpenListings) * 100, 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
        {atLimit ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
            All {maxOpenListings} listing slots are in use. Sell or remove an existing listing to free up a slot before creating a new one.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pointsAmount">Points to Sell</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="pointsAmount"
                  type="number"
                  min={1}
                  max={userPoints}
                  placeholder="e.g. 500"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  disabled={userPoints === 0 || mutation.isPending}
                  className="w-36"
                />
                <span className="text-sm text-muted-foreground">/ {userPoints.toLocaleString()} available</span>
              </div>
            </div>
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a message for potential buyers..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                disabled={userPoints === 0 || mutation.isPending}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={userPoints === 0 || mutation.isPending || !pointsAmount}>
              {mutation.isPending ? "Creating..." : userPoints === 0 ? "No Points Available" : "List Points for Sale"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function SellDialog({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async (buyerCommentId: number) => {
      const res = await fetch(`/api/marketplace/listings/${listing.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ buyerCommentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to complete sale");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Sale completed!", description: "Points have been transferred to the buyer." });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const commenters = listing.comments;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Sold</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Select the buyer from the people who expressed interest:
          </p>
          {commenters.length === 0 ? (
            <p className="text-sm text-center py-4 text-muted-foreground">No interested buyers yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {commenters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCommentId(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCommentId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium text-sm">@{c.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.message}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!selectedCommentId || mutation.isPending}
            onClick={() => selectedCommentId && mutation.mutate(selectedCommentId)}
          >
            {mutation.isPending ? "Completing..." : `Sell ${listing.pointsAmount} pts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListingCard({ listing, currentUserId, isAdmin }: { listing: Listing; currentUserId: number; isAdmin: boolean }) {
  const { toast } = useToast();
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const isOwner = listing.sellerId === currentUserId;
  const hasCommented = listing.comments.some((c) => c.userId === currentUserId);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete listing");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      toast({ title: "Listing removed", description: "The listing has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/marketplace/listings/${listing.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to post comment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      setCommentText("");
      toast({ title: "Interest expressed!", description: "Your message has been posted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {listing.sellerUsername.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">@{listing.sellerUsername}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(listing.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <Badge variant={listing.status === "sold" ? "secondary" : "default"} className={listing.status === "sold" ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
            {listing.status === "sold" ? (
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sold</span>
            ) : "Open"}
          </Badge>
        </div>

        {/* Points */}
        <div className="px-4 pb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{listing.pointsAmount.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
          {listing.note && (
            <p className="text-sm text-muted-foreground mt-1 italic">"{listing.note}"</p>
          )}
          {listing.status === "sold" && listing.buyerUsername && (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-green-600 flex items-center gap-1">
                <User className="w-3 h-3" /> Sold to @{listing.buyerUsername}
              </p>
              {listing.soldAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {format(new Date(listing.soldAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {listing.status === "open" && (
          <div className="px-4 pb-3 flex items-center gap-2">
            {isOwner ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowSellDialog(true)}>
                  <ShoppingBag className="w-4 h-4 mr-1" /> Mark as Sold
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleteMutation.isPending ? "Removing..." : "Remove"}
                </Button>
              </>
            ) : isAdmin ? (
              <>
                {!hasCommented ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowComments(true)}>
                    <MessageCircle className="w-4 h-4 mr-1" /> Express Interest
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">You've expressed interest</p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleteMutation.isPending ? "Removing..." : "Remove"}
                </Button>
              </>
            ) : !hasCommented ? (
              <Button size="sm" variant="ghost" onClick={() => setShowComments(true)}>
                <MessageCircle className="w-4 h-4 mr-1" /> Express Interest
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">You've expressed interest</p>
            )}
          </div>
        )}

        {/* Comments toggle */}
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground border-t flex items-center gap-1 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {listing.comments.length} {listing.comments.length === 1 ? "comment" : "comments"}
          <span className="ml-auto">{showComments ? "▲" : "▼"}</span>
        </button>

        {/* Comments section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t bg-muted/30"
            >
              <div className="p-4 space-y-3">
                {listing.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No comments yet.</p>
                )}
                {listing.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {c.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">@{c.username}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d")}</span>
                      </div>
                      <p className="text-sm mt-0.5 break-words">{c.message}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input for non-owners on open listings */}
                {listing.status === "open" && !isOwner && !hasCommented && (
                  <form onSubmit={handleComment} className="flex gap-2 pt-2">
                    <Input
                      placeholder="Express your interest..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={500}
                      disabled={commentMutation.isPending}
                      className="text-sm"
                    />
                    <Button type="submit" size="sm" disabled={commentMutation.isPending || !commentText.trim()}>
                      {commentMutation.isPending ? "..." : "Send"}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showSellDialog && <SellDialog listing={listing} onClose={() => setShowSellDialog(false)} />}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove listing?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this listing? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirm(false);
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MarketplaceContent() {
  const { user } = useAuth();
  const { settings } = useAppSettings();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const saved = sessionStorage.getItem("mkt_statusFilter");
    return (saved === "open" || saved === "sold") ? saved : "all";
  });
  const [minPoints, setMinPoints] = useState(() => sessionStorage.getItem("mkt_minPoints") ?? "");
  const [maxPoints, setMaxPoints] = useState(() => sessionStorage.getItem("mkt_maxPoints") ?? "");

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/marketplace/listings"],
  });

  if (!user) return null;

  const allListings = listings ?? [];

  const filteredListings = allListings.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    const min = minPoints !== "" ? parseInt(minPoints) : null;
    const max = maxPoints !== "" ? parseInt(maxPoints) : null;
    if (min !== null && !isNaN(min) && l.pointsAmount < min) return false;
    if (max !== null && !isNaN(max) && l.pointsAmount > max) return false;
    return true;
  });

  const hasActiveFilters = statusFilter !== "all" || minPoints !== "" || maxPoints !== "";

  const updateStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    sessionStorage.setItem("mkt_statusFilter", val);
  };

  const updateMinPoints = (val: string) => {
    setMinPoints(val);
    if (val === "") sessionStorage.removeItem("mkt_minPoints");
    else sessionStorage.setItem("mkt_minPoints", val);
  };

  const updateMaxPoints = (val: string) => {
    setMaxPoints(val);
    if (val === "") sessionStorage.removeItem("mkt_maxPoints");
    else sessionStorage.setItem("mkt_maxPoints", val);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setMinPoints("");
    setMaxPoints("");
    sessionStorage.removeItem("mkt_statusFilter");
    sessionStorage.removeItem("mkt_minPoints");
    sessionStorage.removeItem("mkt_maxPoints");
  };

  const openCount = allListings.filter((l) => l.status === "open").length;
  const soldCount = allListings.filter((l) => l.status === "sold").length;
  const userOpenListingsCount = allListings.filter((l) => l.status === "open" && l.sellerId === user.id).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Points Marketplace</h1>
              <p className="text-sm text-muted-foreground">Buy and sell points with other users</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
              <span className="text-sm font-semibold text-primary">{(user.points ?? 0).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>

          {/* Create listing */}
          <CreateListingCard userPoints={user.points ?? 0} openListingsCount={userOpenListingsCount} maxOpenListings={settings.max_open_listings} />

          {/* Filter bar */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter Listings</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Status:</span>
              {(["all", "open", "sold"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s === "all" ? `All (${allListings.length})` : s === "open" ? `Open (${openCount})` : `Sold (${soldCount})`}
                </button>
              ))}
            </div>

            {/* Points range */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Points range:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={minPoints}
                  onChange={(e) => updateMinPoints(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={maxPoints}
                  onChange={(e) => updateMaxPoints(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            </div>
          </div>

          {/* Listings */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {statusFilter === "sold" ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              )}
              {statusFilter === "all" ? "All Listings" : statusFilter === "open" ? "Open Listings" : "Sold Listings"}
              <Badge variant="secondary" className="ml-1">{filteredListings.length}</Badge>
              {hasActiveFilters && (
                <span className="text-xs font-normal text-muted-foreground">
                  (filtered from {allListings.length})
                </span>
              )}
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-xl bg-muted/20">
                <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {hasActiveFilters ? (
                  <p>No listings match your filters. <button type="button" onClick={clearFilters} className="underline hover:text-foreground">Clear filters</button></p>
                ) : (
                  <p>No listings yet. Be the first to list your points!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} currentUserId={user.id} isAdmin={user.role === "admin" || user.role === "superadmin"} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




﻿import { ProtectedRoute } from "@/lib/protected-route";
export default function Page() {
  return (
    <ProtectedRoute>
      <MarketplaceContent />
    </ProtectedRoute>
  );
}

