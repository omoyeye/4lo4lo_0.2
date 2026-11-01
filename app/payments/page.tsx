"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import DesktopTopBar from "@/components/layout/DesktopTopBar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { ProtectedRoute } from "@/lib/protected-route";
import EmailVerificationBanner, { useEmailVerification } from "@/components/account/EmailVerificationBanner";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function PaymentsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: "",
    paymentMethod: "paypal",
    paymentDetails: "",
  });

  const { data: payouts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payouts/user/${user?.id}`],
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const { data: verification } = useEmailVerification();

  const minimum = parseInt(settings?.minimum_points_to_withdraw ?? "0", 10) || 0;
  const hasOpenRequest = payouts.some((p) => p.status === "pending" || p.status === "processing");
  const blockedByEmail = !!verification?.enabled && verification.required && !verification.verified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseInt(paymentDetails.amount, 10);
    if (!amount || amount <= 0) return setError("Enter how many points to withdraw");
    if (user && amount > user.points) return setError(`You have ${user.points.toLocaleString()} points available`);
    if (minimum && amount < minimum) return setError(`The minimum withdrawal is ${minimum.toLocaleString()} points`);

    setSubmitting(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          paymentMethod: paymentDetails.paymentMethod,
          paymentDetails: paymentDetails.paymentDetails,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to request payout");

      toast({ title: "Payout requested", description: "The points are reserved while we process your request." });
      setPaymentDetails({ ...paymentDetails, amount: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/payouts/user/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payout request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        <DesktopTopBar />
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Payments</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Request payouts and view payment history</p>
          </div>

          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-5 text-white shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/80">Available to withdraw</p>
                <p className="text-3xl font-bold tabular-nums">{(user?.points ?? 0).toLocaleString()} pts</p>
              </div>
              {(user?.pendingPoints ?? 0) > 0 && (
                <div className="text-right text-sm">
                  <p className="text-white/80">In review</p>
                  <p className="font-semibold tabular-nums">{user!.pendingPoints.toLocaleString()} pts</p>
                </div>
              )}
            </div>
            <EmailVerificationBanner />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-1">Request Payout</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {minimum ? `Minimum ${minimum.toLocaleString()} points. ` : ""}Points are reserved when you submit and returned if the request is declined.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs md:text-sm font-medium" htmlFor="payout-amount">Amount (Points)</label>
                  <Input
                    id="payout-amount"
                    type="number"
                    min={1}
                    value={paymentDetails.amount}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                    placeholder="Enter amount"
                    className="text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium" htmlFor="payout-method">Payment Method</label>
                  <select
                    id="payout-method"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentMethod: e.target.value })}
                    required
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium" htmlFor="payout-details">Payment Details</label>
                  <Input
                    id="payout-details"
                    value={paymentDetails.paymentDetails}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentDetails: e.target.value })}
                    placeholder={paymentDetails.paymentMethod === "paypal" ? "Your PayPal email" : "Bank name, account name and number"}
                    className="text-sm"
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {hasOpenRequest && <p className="text-sm text-muted-foreground">You have a request being processed. You can make another once it&apos;s done.</p>}

                <Button type="submit" className="w-full text-sm" size="sm" disabled={submitting || hasOpenRequest || blockedByEmail}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {blockedByEmail ? "Confirm your email first" : "Request Payout"}
                </Button>
              </form>
            </Card>

            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4">Payment History</h2>
              {isLoading ? (
                <p className="text-sm text-center">Loading...</p>
              ) : payouts.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {payouts.map((payout: any) => (
                    <div key={payout.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border rounded-xl">
                      <div>
                        <p className="text-sm md:text-base font-medium tabular-nums">{payout.amount.toLocaleString()} points</p>
                        <p className="text-xs text-muted-foreground">{payout.paymentMethod === "bank_transfer" ? "Bank transfer" : "PayPal"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[payout.status] ?? "bg-muted text-muted-foreground"}`}>
                          {payout.status}
                        </span>
                        <p className="text-xs md:text-sm text-muted-foreground">{new Date(payout.requestedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">No payment history yet</p>
              )}
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}
