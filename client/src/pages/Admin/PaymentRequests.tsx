import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Payout, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User as UserIcon,
  Coins
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// Helper function to convert points to currency (5 points = $1)
const pointsToCurrency = (points: number): number => {
  return points / 5;
};

// Minimum withdrawal requirement
const MINIMUM_WITHDRAWAL_POINTS = 500; // $100
const MINIMUM_WITHDRAWAL_CURRENCY = 100; // $100

interface PayoutWithUser extends Payout {
  user?: {
    id: number;
    username: string;
    email: string;
    points: number;
  } | null;
}

export default function PaymentRequests() {
  const { toast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState<PayoutWithUser | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  
  // Status colors for badges
  const statusColors: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
    pending: { 
      bg: "bg-yellow-100 dark:bg-yellow-900", 
      text: "text-yellow-800 dark:text-yellow-100", 
      icon: <Clock className="h-4 w-4 mr-1" /> 
    },
    approved: { 
      bg: "bg-blue-100 dark:bg-blue-900", 
      text: "text-blue-800 dark:text-blue-100", 
      icon: <CheckCircle className="h-4 w-4 mr-1" /> 
    },
    completed: { 
      bg: "bg-green-100 dark:bg-green-900", 
      text: "text-green-800 dark:text-green-100", 
      icon: <CheckCircle className="h-4 w-4 mr-1" /> 
    },
    rejected: { 
      bg: "bg-red-100 dark:bg-red-900", 
      text: "text-red-800 dark:text-red-100", 
      icon: <XCircle className="h-4 w-4 mr-1" /> 
    },
  };
  
  // Fetch all payouts with real-time polling
  const { data: payouts = [], isLoading } = useQuery<PayoutWithUser[]>({
    queryKey: ['/api/admin/payouts'],
    refetchInterval: 3000 // Refetch every 3 seconds for real-time updates
  });
  
  // Update payout status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest('PATCH', `/api/admin/payouts/${id}`, {
        status,
        processedBy: 1 // TODO: Get actual admin ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      setIsViewDetailsOpen(false);
      toast({
        title: "Status Updated",
        description: "Payout status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payout status.",
        variant: "destructive"
      });
    }
  });
  
  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const handleViewDetails = (payout: PayoutWithUser) => {
    setSelectedPayout(payout);
    setIsViewDetailsOpen(true);
  };
  
  // Calculate stats
  const stats = {
    total: payouts.length,
    pending: payouts.filter(p => p.status === 'pending').length,
    approved: payouts.filter(p => p.status === 'approved').length,
    completed: payouts.filter(p => p.status === 'completed').length,
    rejected: payouts.filter(p => p.status === 'rejected').length,
    totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0)
  };
  
  return (
    <div className="p-6 space-y-6" data-testid="payment-requests-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="page-title">Payment Requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage and process user payout requests
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold flex items-center">
                <Coins className="h-5 w-5 mr-1" />
                {stats.totalAmount} pts
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                <DollarSign className="h-3 w-3 mr-1" />
                ${pointsToCurrency(stats.totalAmount).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Requests</CardTitle>
          <CardDescription>
            Review and process payout requests from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => {
                    const statusConfig = statusColors[payout.status] || statusColors.pending;
                    return (
                      <TableRow key={payout.id} data-testid={`payout-row-${payout.id}`}>
                        <TableCell className="font-medium">#{payout.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-2" />
                            {payout.userId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center font-semibold">
                              <Coins className="h-4 w-4 mr-1" />
                              {payout.amount} pts
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <DollarSign className="h-3 w-3 mr-0.5" />
                              {pointsToCurrency(payout.amount).toFixed(2)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{payout.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} flex items-center w-fit`}>
                            {statusConfig.icon}
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(payout.requestedAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {payout.processedAt 
                            ? format(new Date(payout.processedAt), 'MMM dd, yyyy HH:mm')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(payout)}
                            data-testid={`button-view-${payout.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Request Details</DialogTitle>
            <DialogDescription>
              Review and process this payout request
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-4">
              {/* User Information Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Username</label>
                    <p className="text-lg font-semibold">{selectedPayout.user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{selectedPayout.user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-lg font-semibold">{selectedPayout.userId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Total Points</label>
                    <div className="space-y-0.5">
                      <p className="text-lg font-semibold flex items-center">
                        <Coins className="h-5 w-5 mr-1" />
                        {selectedPayout.user?.points || 0} pts
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <DollarSign className="h-4 w-4 mr-0.5" />
                        ${pointsToCurrency(selectedPayout.user?.points || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Request Details Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Request Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                    <p className="text-lg font-semibold">#{selectedPayout.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Withdrawal Amount</label>
                    <div className="space-y-0.5">
                      <p className="text-lg font-semibold flex items-center">
                        <Coins className="h-5 w-5 mr-1 text-primary" />
                        {selectedPayout.amount} pts
                      </p>
                      <p className="text-base flex items-center text-green-600 dark:text-green-400 font-semibold">
                        <DollarSign className="h-4 w-4 mr-0.5" />
                        ${pointsToCurrency(selectedPayout.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge className={`${statusColors[selectedPayout.status]?.bg} ${statusColors[selectedPayout.status]?.text} flex items-center w-fit`}>
                        {statusColors[selectedPayout.status]?.icon}
                        {selectedPayout.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <p className="text-lg capitalize">{selectedPayout.paymentMethod}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Requested At</label>
                    <p className="text-lg">{format(new Date(selectedPayout.requestedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {selectedPayout.processedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Processed At</label>
                      <p className="text-lg">{format(new Date(selectedPayout.processedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Payment Details */}
              {selectedPayout.paymentDetails && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Payment Details</h3>
                  <p className="text-base whitespace-pre-wrap">{selectedPayout.paymentDetails}</p>
                </div>
              )}
              
              {/* Withdrawal Info */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Minimum withdrawal amount is {MINIMUM_WITHDRAWAL_POINTS} points (${MINIMUM_WITHDRAWAL_CURRENCY}). 
                  Conversion rate: 5 points = $1
                </p>
              </div>
              
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-3 block">Update Status</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleStatusUpdate(selectedPayout.id, 'approved')}
                    disabled={selectedPayout.status === 'approved' || updateStatusMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-approve"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedPayout.id, 'completed')}
                    disabled={selectedPayout.status === 'completed' || updateStatusMutation.isPending}
                    variant="default"
                    className="flex-1"
                    data-testid="button-complete"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Complete
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedPayout.id, 'rejected')}
                    disabled={selectedPayout.status === 'rejected' || updateStatusMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                    data-testid="button-reject"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
