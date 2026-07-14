"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function PaymentsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentDetails, setPaymentDetails] = useState({
    amount: "",
    paymentMethod: "paypal",
    paymentDetails: ""
  });

  const { data: payouts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payouts/user/${user?.id}`],
    enabled: !!user?.id,
    refetchInterval: 5000 // Refetch every 5 seconds for real-time updates
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          amount: parseInt(paymentDetails.amount),
          paymentMethod: paymentDetails.paymentMethod,
          paymentDetails: paymentDetails.paymentDetails
        })
      });

      if (!res.ok) throw new Error('Failed to request payout');
      
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted for processing.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit payout request.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Payments</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
              Request payouts and view payment history
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4">Request Payout</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs md:text-sm font-medium">Amount (Points)</label>
                  <Input
                    type="number"
                    value={paymentDetails.amount}
                    onChange={(e) => setPaymentDetails({...paymentDetails, amount: e.target.value})}
                    placeholder="Enter amount"
                    className="text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium">Payment Method</label>
                  <select 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({...paymentDetails, paymentMethod: e.target.value})}
                    required
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium">Payment Details</label>
                  <Input
                    value={paymentDetails.paymentDetails}
                    onChange={(e) => setPaymentDetails({...paymentDetails, paymentDetails: e.target.value})}
                    placeholder="Enter PayPal email or bank details"
                    className="text-sm"
                    required
                  />
                </div>

                <Button type="submit" className="w-full text-sm" size="sm">
                  Request Payout
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
                    <div key={payout.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border rounded">
                      <div>
                        <p className="text-sm md:text-base font-medium">{payout.amount} points</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{payout.status}</p>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </p>
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




﻿export default function Page() {
  return <PaymentsContent />;
}

