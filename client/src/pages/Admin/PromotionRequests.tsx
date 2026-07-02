import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PromotionRequest, PromotionPlan } from "@shared/schema";
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
  CardFooter,
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
  AlertCircle, 
  ExternalLink,
  DollarSign
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function PromotionRequestsAdmin() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  
  // Status colors for badges
  const statusColors: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
    pending: { 
      bg: "bg-yellow-100", 
      text: "text-yellow-800", 
      icon: <Clock className="h-4 w-4 mr-1" /> 
    },
    approved: { 
      bg: "bg-blue-100", 
      text: "text-blue-800", 
      icon: <CheckCircle className="h-4 w-4 mr-1" /> 
    },
    in_progress: { 
      bg: "bg-purple-100", 
      text: "text-purple-800", 
      icon: <Loader2 className="h-4 w-4 mr-1" /> 
    },
    completed: { 
      bg: "bg-green-100", 
      text: "text-green-800", 
      icon: <CheckCircle className="h-4 w-4 mr-1" /> 
    },
    cancelled: { 
      bg: "bg-red-100", 
      text: "text-red-800", 
      icon: <XCircle className="h-4 w-4 mr-1" /> 
    },
  };

  // Payment status colors for badges
  const paymentStatusColors: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
    unpaid: { 
      bg: "bg-orange-100", 
      text: "text-orange-800", 
      icon: <AlertCircle className="h-4 w-4 mr-1" /> 
    },
    paid: { 
      bg: "bg-green-100", 
      text: "text-green-800", 
      icon: <DollarSign className="h-4 w-4 mr-1" /> 
    },
  };

  // Fetch all promotion requests
  const { data: requests, isLoading: isLoadingRequests } = useQuery<PromotionRequest[]>({
    queryKey: ['/api/promotion/requests'],
    queryFn: async () => {
      const response = await fetch('/api/promotion/requests', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch promotion requests');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch all promotion plans for reference
  const { data: plans } = useQuery<PromotionPlan[]>({
    queryKey: ['/api/promotion/plans'],
    queryFn: async () => {
      const response = await fetch('/api/promotion/plans');
      if (!response.ok) throw new Error('Failed to fetch promotion plans');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch promotion request statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/promotion/requests/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/promotion/requests/stats');
      if (!response.ok) throw new Error('Failed to fetch promotion request stats');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Update request status mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      paymentStatus, 
      adminNotes 
    }: { 
      id: number; 
      status?: string; 
      paymentStatus?: string;
      adminNotes?: string;
    }) => {
      const response = await apiRequest('PATCH', `/api/promotion/requests/${id}`, {
        status,
        paymentStatus,
        adminNotes,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update promotion request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/promotion/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotion/requests/stats'] });
      
      toast({
        title: "Request updated successfully",
        description: "The promotion request has been updated.",
      });
      
      setIsViewDetailsOpen(false);
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update request",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Get plan name by ID
  const getPlanName = (planId: number) => {
    if (!plans) return "Unknown Plan";
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : "Unknown Plan";
  };

  // Handle opening request details
  const handleViewDetails = (request: PromotionRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setIsViewDetailsOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = (status: string) => {
    if (!selectedRequest) return;
    
    updateRequestMutation.mutate({ 
      id: selectedRequest.id, 
      status, 
      adminNotes 
    });
  };

  // Handle payment status update
  const handlePaymentStatusUpdate = (paymentStatus: string) => {
    if (!selectedRequest) return;
    
    updateRequestMutation.mutate({ 
      id: selectedRequest.id, 
      paymentStatus, 
      adminNotes 
    });
  };

  // Format date helper
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Promotion Requests</h2>
        <p className="text-muted-foreground">
          Manage and monitor user promotion requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                requests?.length || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                stats?.statusCounts?.pending || 0
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                `$${stats?.revenue?.total || '0.00'}`
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promotion Requests</CardTitle>
          <CardDescription>
            View and manage all promotion requests from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No promotion requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Engagements</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests
                    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.id}</TableCell>
                        <TableCell>{request.userId}</TableCell>
                        <TableCell>{getPlanName(request.planId)}</TableCell>
                        <TableCell className="capitalize">{request.platform}</TableCell>
                        <TableCell>{request.customEngagementCount?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell>${Number(request.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            className={`${statusColors[request.status]?.bg} ${statusColors[request.status]?.text} flex items-center px-2 py-1`}
                          >
                            {statusColors[request.status]?.icon}
                            <span className="capitalize">{request.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${paymentStatusColors[request.paymentStatus]?.bg} ${paymentStatusColors[request.paymentStatus]?.text} flex items-center px-2 py-1`}
                          >
                            {paymentStatusColors[request.paymentStatus]?.icon}
                            <span className="capitalize">{request.paymentStatus}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.requestedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Promotion Request Details</DialogTitle>
            <DialogDescription>
              View and manage this promotion request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="grid gap-6 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Request Information</h3>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <dt className="font-medium">Request ID:</dt>
                    <dd className="col-span-2">{selectedRequest.id}</dd>
                    
                    <dt className="font-medium">User ID:</dt>
                    <dd className="col-span-2">{selectedRequest.userId}</dd>
                    
                    <dt className="font-medium">Plan:</dt>
                    <dd className="col-span-2">{getPlanName(selectedRequest.planId)}</dd>
                    
                    <dt className="font-medium">Platform:</dt>
                    <dd className="col-span-2 capitalize">{selectedRequest.platform}</dd>
                    
                    <dt className="font-medium">Engagements:</dt>
                    <dd className="col-span-2">{selectedRequest.customEngagementCount?.toLocaleString() || 'N/A'}</dd>
                    
                    <dt className="font-medium">Price:</dt>
                    <dd className="col-span-2">${Number(selectedRequest.price).toFixed(2)}</dd>
                    
                    <dt className="font-medium">Requested:</dt>
                    <dd className="col-span-2">{formatDate(selectedRequest.requestedAt)}</dd>
                    
                    <dt className="font-medium">Updated:</dt>
                    <dd className="col-span-2">{formatDate(selectedRequest.updatedAt)}</dd>
                    
                    <dt className="font-medium">Completed:</dt>
                    <dd className="col-span-2">{formatDate(selectedRequest.completedAt)}</dd>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Social Media Details</h3>
                  <dl className="grid grid-cols-3 gap-2 text-sm mb-4">
                    <dt className="font-medium">URL:</dt>
                    <dd className="col-span-2 flex items-center">
                      <a 
                        href={selectedRequest.socialMediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary flex items-center hover:underline"
                      >
                        {selectedRequest.socialMediaUrl.substring(0, 30)}...
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </dd>
                    
                    <dt className="font-medium">Engagement:</dt>
                    <dd className="col-span-2 capitalize">{selectedRequest.engagementType}</dd>
                  </dl>
                  
                  <h4 className="font-medium text-sm">Additional Details:</h4>
                  <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                    {selectedRequest.additionalDetails || "No additional details provided."}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      defaultValue={selectedRequest.status}
                      onValueChange={(value) => handleStatusUpdate(value)}
                      disabled={updateRequestMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment">Payment Status</Label>
                    <Select
                      defaultValue={selectedRequest.paymentStatus}
                      onValueChange={(value) => handlePaymentStatusUpdate(value)}
                      disabled={updateRequestMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Admin Notes</Label>
                    <Textarea
                      id="notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this request"
                      rows={3}
                      disabled={updateRequestMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDetailsOpen(false)}
              disabled={updateRequestMutation.isPending}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest) {
                  updateRequestMutation.mutate({
                    id: selectedRequest.id,
                    adminNotes
                  });
                }
              }}
              disabled={updateRequestMutation.isPending}
            >
              {updateRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}