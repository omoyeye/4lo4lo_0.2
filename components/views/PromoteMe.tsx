"use client";


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, CheckCircle, Loader2, Download, CreditCard, ClipboardList, Coins } from "lucide-react";
import { 
  SiFacebook, 
  SiInstagram, 
  SiTiktok, 
  SiYoutube, 
  SiWhatsapp, 
  SiTelegram, 
  SiX, 
  SiLinkedin, 
  SiSnapchat, 
  SiPinterest, 
  SiDiscord, 
  SiThreads,
  SiGoogle
} from "react-icons/si";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PromotionPlan } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { generatePDFReceipt, downloadPDF, type PurchaseDetails } from "@/lib/pdf-receipt";

const platformConfig: Record<string, { 
  name: string; 
  icon: React.ReactNode; 
  bgGradient: string; 
  borderColor: string;
  textColor: string;
  iconBg: string;
}> = {
  facebook: {
    name: "Facebook",
    icon: <SiFacebook className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#1877F2]/10 to-[#1877F2]/5",
    borderColor: "border-[#1877F2]/30",
    textColor: "text-[#1877F2]",
    iconBg: "bg-[#1877F2]"
  },
  instagram: {
    name: "Instagram",
    icon: <SiInstagram className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#E4405F]/10 via-[#FCAF45]/5 to-[#833AB4]/10",
    borderColor: "border-[#E4405F]/30",
    textColor: "text-[#E4405F]",
    iconBg: "bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]"
  },
  tiktok: {
    name: "TikTok",
    icon: <SiTiktok className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#00F2EA]/10 to-[#FF0050]/10",
    borderColor: "border-[#00F2EA]/30",
    textColor: "text-[#00F2EA]",
    iconBg: "bg-gradient-to-r from-[#00F2EA] to-[#FF0050]"
  },
  youtube: {
    name: "YouTube",
    icon: <SiYoutube className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#FF0000]/10 to-[#FF0000]/5",
    borderColor: "border-[#FF0000]/30",
    textColor: "text-[#FF0000]",
    iconBg: "bg-[#FF0000]"
  },
  whatsapp: {
    name: "WhatsApp",
    icon: <SiWhatsapp className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#25D366]/10 to-[#25D366]/5",
    borderColor: "border-[#25D366]/30",
    textColor: "text-[#25D366]",
    iconBg: "bg-[#25D366]"
  },
  telegram: {
    name: "Telegram",
    icon: <SiTelegram className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#0088CC]/10 to-[#0088CC]/5",
    borderColor: "border-[#0088CC]/30",
    textColor: "text-[#0088CC]",
    iconBg: "bg-[#0088CC]"
  },
  twitter: {
    name: "Twitter/X",
    icon: <SiX className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#000000]/10 to-[#000000]/5",
    borderColor: "border-[#000000]/30",
    textColor: "text-foreground",
    iconBg: "bg-black"
  },
  linkedin: {
    name: "LinkedIn",
    icon: <SiLinkedin className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#0A66C2]/10 to-[#0A66C2]/5",
    borderColor: "border-[#0A66C2]/30",
    textColor: "text-[#0A66C2]",
    iconBg: "bg-[#0A66C2]"
  },
  snapchat: {
    name: "Snapchat",
    icon: <SiSnapchat className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#FFFC00]/10 to-[#FFFC00]/5",
    borderColor: "border-[#FFFC00]/30",
    textColor: "text-[#FFFC00]",
    iconBg: "bg-[#FFFC00]"
  },
  pinterest: {
    name: "Pinterest",
    icon: <SiPinterest className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#E60023]/10 to-[#E60023]/5",
    borderColor: "border-[#E60023]/30",
    textColor: "text-[#E60023]",
    iconBg: "bg-[#E60023]"
  },
  discord: {
    name: "Discord",
    icon: <SiDiscord className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/5",
    borderColor: "border-[#5865F2]/30",
    textColor: "text-[#5865F2]",
    iconBg: "bg-[#5865F2]"
  },
  threads: {
    name: "Threads",
    icon: <SiThreads className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#000000]/10 to-[#000000]/5",
    borderColor: "border-[#000000]/30",
    textColor: "text-foreground",
    iconBg: "bg-black"
  },
  google_review: {
    name: "Google Review",
    icon: <SiGoogle className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-[#4285F4]/10 to-[#4285F4]/5",
    borderColor: "border-[#4285F4]/30",
    textColor: "text-[#4285F4]",
    iconBg: "bg-[#4285F4]"
  },
  survey: {
    name: "Survey",
    icon: <ClipboardList className="w-6 h-6" />,
    bgGradient: "bg-gradient-to-br from-primary/10 to-primary/5",
    borderColor: "border-primary/30",
    textColor: "text-primary",
    iconBg: "bg-primary"
  }
};

export default function PromoteMe() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [customEngagementCount, setCustomEngagementCount] = useState<number>(1000);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [formData, setFormData] = useState({
    socialMediaUrl: "",
    engagementType: "",
    additionalDetails: ""
  });
  const { toast } = useToast();
  const userId = (typeof window !== 'undefined' ? localStorage.getItem("userId") : null) ? parseInt((typeof window !== 'undefined' ? localStorage.getItem("userId") : null)!) : null;
  
  // Check URL params for payment status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id');
    
    if (status === 'success' && sessionId) {
      toast({
        title: "Payment Successful!",
        description: "Your promotion request has been submitted successfully.",
      });
      // Clean URL
      window.history.replaceState({}, '', '/promote-me');
    } else if (status === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again.",
        variant: "destructive"
      });
      window.history.replaceState({}, '', '/promote-me');
    }
  }, [toast]);
  
  // Fetch promotion plans from the database
  const { data: plans, isLoading, error } = useQuery<PromotionPlan[]>({
    queryKey: ['/api/promotion/plans'],
    queryFn: async () => {
      const response = await fetch('/api/promotion/plans');
      if (!response.ok) throw new Error('Failed to fetch promotion plans');
      return response.json();
    }
  });
  
  // Fetch app settings for points conversion rate
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ['/api/settings'],
  });
  
  // Fetch user data for points balance
  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['/api/user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/user/${userId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId
  });
  
  // Calculate conversion rate and point requirements
  const conversionRate = parseFloat(settings?.points_to_currency_rate || "0.001");
  const userPoints = userData?.points || 0;
  
  // Create a mutation for creating Stripe checkout session
  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("You must be logged in to submit a promotion request");
      }
      
      if (!selectedTier) {
        throw new Error("Please select a plan");
      }
      
      if (!formData.socialMediaUrl) {
        throw new Error("Please enter your social media URL");
      }
      
      if (!formData.engagementType) {
        throw new Error("Please select an engagement type");
      }
      
      const plan = plans?.find(p => p.id === selectedTier);
      if (!plan) {
        throw new Error("Selected plan not found");
      }

      // Get current user info
      const userResponse = await fetch(`/api/user/${userId}`, { credentials: 'include' });
      if (!userResponse.ok) {
        throw new Error("Failed to get user information");
      }
      const user = await userResponse.json();
      
      // Show confirmation dialog first
      const basePrice = Number(plan.price);
      const baseEngagement = plan.engagementCount;
      const multiplier = customEngagementCount / baseEngagement;
      const totalPrice = basePrice * multiplier;
      
      const details: PurchaseDetails = {
        clientName: user.username,
        clientEmail: user.email,
        membershipDate: new Date(user.createdAt).toLocaleDateString(),
        planName: plan.name,
        baseEngagementCount: baseEngagement,
        customEngagementCount,
        basePrice,
        totalPrice,
        socialMediaUrl: formData.socialMediaUrl,
        engagementType: formData.engagementType,
        additionalDetails: formData.additionalDetails || "",
        receiptId: `4LO-${Date.now()}`,
        purchaseDate: new Date().toLocaleDateString()
      };
      
      return { details, plan, user };
    },
    onSuccess: ({ details, plan, user }) => {
      setPurchaseDetails(details);
      setShowConfirmDialog(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for proceeding to Stripe checkout
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseDetails) throw new Error("No purchase details");
      
      const plan = plans?.find(p => p.id === selectedTier);
      if (!plan) throw new Error("Plan not found");
      
      const response = await apiRequest("POST", "/api/promotion/create-checkout", {
        userId,
        planId: selectedTier,
        customEngagementCount,
        socialMediaUrl: formData.socialMediaUrl,
        platform: detectPlatformFromUrl(formData.socialMediaUrl),
        engagementType: formData.engagementType,
        additionalDetails: formData.additionalDetails
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    },
    onError: (error) => {
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for paying with points
  const payWithPointsMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseDetails) throw new Error("No purchase details");
      
      const plan = plans?.find(p => p.id === selectedTier);
      if (!plan) throw new Error("Plan not found");
      
      const response = await apiRequest("POST", "/api/promotion/pay-with-points", {
        userId,
        planId: selectedTier,
        customEngagementCount,
        socialMediaUrl: formData.socialMediaUrl,
        platform: detectPlatformFromUrl(formData.socialMediaUrl),
        engagementType: formData.engagementType,
        additionalDetails: formData.additionalDetails
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Promotion request submitted! ${data.pointsDeducted.toLocaleString()} points deducted. Remaining: ${data.remainingPoints.toLocaleString()} points.`,
      });
      setShowConfirmDialog(false);
      setPurchaseDetails(null);
      setSelectedTier(null);
      setFormData({ socialMediaUrl: "", engagementType: "", additionalDetails: "" });
      refetchUser();
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process points payment",
        variant: "destructive"
      });
    }
  });
  
  // Calculate required points for current selection
  const calculateRequiredPoints = (price: number) => {
    return Math.ceil(price / conversionRate);
  };
  
  // Handle downloading PDF receipt
  const handleDownloadReceipt = () => {
    if (!purchaseDetails) return;
    
    const pdf = generatePDFReceipt(purchaseDetails);
    downloadPDF(pdf, `4LO4LO_Receipt_${purchaseDetails.receiptId}.pdf`);
    
    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been saved successfully",
    });
  };
  
  // Helper function to detect platform from URL
  const detectPlatformFromUrl = (url: string): string => {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com')) return 'twitter';
    return 'other';
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, engagementType: value }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRequestMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <div className="flex-1">
          <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                <Rocket className="w-5 h-5 md:w-6 md:h-6" />
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Promote Me</h1>
              </div>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2 mb-6">
                Boost your social media presence with real engagement from active users. Choose your desired engagement level and let us help you grow your online presence.
              </p>

            </div>

            {/* Pricing Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
              {isLoading ? (
                // Loading state for plans
                Array(3).fill(null).map((_, i) => (
                  <Card key={i} className="flex flex-col items-center justify-center p-4 md:p-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Loading plans...</p>
                  </Card>
                ))
              ) : error ? (
                // Error state
                <div className="col-span-1 md:col-span-3 p-4 md:p-6 text-center">
                  <p className="text-sm md:text-base text-red-500 mb-2">Failed to load promotion plans</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/promotion/plans'] })}
                  >
                    Try Again
                  </Button>
                </div>
              ) : plans && plans.length > 0 ? (
                // Render plans from database with platform styling
                plans
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .filter(plan => plan.isActive)
                  .map((plan) => {
                    const platform = (plan as any).platform || "facebook";
                    const config = platformConfig[platform] || platformConfig.facebook;
                    
                    return (
                      <Card 
                        key={plan.id} 
                        className={`transition-all overflow-hidden ${config.bgGradient} ${
                          selectedTier === plan.id 
                            ? `${config.borderColor} border-2 shadow-lg scale-105` 
                            : `${config.borderColor} border hover:shadow-md hover:scale-[1.02]`
                        }`}
                      >
                        <CardHeader className="pb-3 relative">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center text-white`}>
                              {config.icon}
                            </div>
                          </div>
                          <CardTitle className={`text-center text-lg md:text-xl ${config.textColor}`}>
                            {plan.name}
                          </CardTitle>
                          <p className="text-xs text-center text-muted-foreground mt-1">
                            {config.name}
                          </p>
                        </CardHeader>
                        <CardContent className="text-center space-y-3 md:space-y-4">
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {plan.engagementCount.toLocaleString()} Engagements
                          </div>
                          <div className={`text-2xl md:text-3xl font-bold ${config.textColor}`}>
                            ${Number(plan.price).toFixed(2)}
                          </div>
                          {/* Point equivalent display */}
                          {(() => {
                            const pointsNeeded = calculateRequiredPoints(Number(plan.price));
                            const canAfford = userPoints >= pointsNeeded;
                            return (
                              <div className={`text-xs px-2 py-1 rounded-full ${canAfford ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                                <Coins className="inline w-3 h-3 mr-1" />
                                {pointsNeeded.toLocaleString()} pts
                                {canAfford && ' ✓'}
                              </div>
                            );
                          })()}
                          <Button 
                            variant={selectedTier === plan.id ? "default" : "outline"}
                            className={`w-full ${selectedTier === plan.id ? '' : `hover:${config.borderColor}`}`}
                            size="sm"
                            onClick={() => setSelectedTier(plan.id)}
                          >
                            {selectedTier === plan.id ? "Selected" : "Select Plan"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
              ) : (
                // No plans available
                <div className="col-span-1 md:col-span-3 p-4 md:p-6 text-center">
                  <p className="text-sm md:text-base text-muted-foreground">No promotion plans available at the moment.</p>
                </div>
              )}
            </div>

            {/* Promotion Form */}
            <Card className="mb-6 md:mb-8">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">Submit Your Promotion Request</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Social Media URL</label>
                    <Input 
                      name="socialMediaUrl"
                      value={formData.socialMediaUrl}
                      onChange={handleInputChange}
                      placeholder="Enter your social media profile URL" 
                      disabled={submitRequestMutation.isPending}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Engagement Type</label>
                    <Select 
                      value={formData.engagementType} 
                      onValueChange={handleSelectChange}
                      disabled={submitRequestMutation.isPending}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select what you need" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="followers">Followers Growth</SelectItem>
                        <SelectItem value="views">Video/Post Views</SelectItem>
                        <SelectItem value="likes">Likes & Reactions</SelectItem>
                        <SelectItem value="comments">Comments & Engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Additional Details</label>
                    <Textarea 
                      name="additionalDetails"
                      value={formData.additionalDetails}
                      onChange={handleInputChange}
                      placeholder="Describe what kind of engagement you're looking for and any specific requirements..."
                      className="h-24 md:h-32 text-sm"
                      disabled={submitRequestMutation.isPending}
                    />
                  </div>

                  {/* Custom Engagement Count Input */}
                  {selectedTier && (
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium">Number of Engagements</label>
                      <Input 
                        type="number"
                        min={plans?.find(p => p.id === selectedTier)?.engagementCount || 1000}
                        step={100}
                        value={customEngagementCount}
                        onChange={(e) => setCustomEngagementCount(parseInt(e.target.value) || 1000)}
                        placeholder="Enter number of engagements"
                        disabled={submitRequestMutation.isPending}
                        className="text-sm"
                      />
                      <p className="text-xs md:text-sm text-muted-foreground break-words">
                        Base: {plans?.find(p => p.id === selectedTier)?.engagementCount.toLocaleString()} engagements for ${Number(plans?.find(p => p.id === selectedTier)?.price).toFixed(2)}
                      </p>
                      
                      {/* Price Calculation Display */}
                      {(() => {
                        const plan = plans?.find(p => p.id === selectedTier);
                        if (!plan) return null;
                        
                        const baseEngagement = plan.engagementCount;
                        const basePrice = Number(plan.price);
                        const multiplier = customEngagementCount / baseEngagement;
                        const calculatedPrice = basePrice * multiplier;
                        const requiredPoints = calculateRequiredPoints(calculatedPrice);
                        const canPayWithPoints = userPoints >= requiredPoints;
                        
                        return (
                          <div className="space-y-3">
                            <div className="p-3 md:p-4 bg-muted rounded-lg">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-sm md:text-base font-medium">Total Price:</span>
                                <span className="text-xl md:text-2xl font-bold text-primary">${calculatedPrice.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 break-words">
                                {customEngagementCount.toLocaleString()} engagements × ${(basePrice / baseEngagement * 1000).toFixed(2)}/1k = ${calculatedPrice.toFixed(2)}
                              </p>
                            </div>
                            
                            {/* Points payment option */}
                            <div className={`p-3 md:p-4 rounded-lg border-2 ${canPayWithPoints ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-dashed border-muted-foreground/30 bg-muted/50'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Coins className={`w-5 h-5 ${canPayWithPoints ? 'text-green-600' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${canPayWithPoints ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                                  Pay with Points
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs text-muted-foreground">Required:</span>
                                <span className={`text-lg font-bold ${canPayWithPoints ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                  {requiredPoints.toLocaleString()} pts
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">Your balance:</span>
                                <span className={`text-sm font-medium ${canPayWithPoints ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                                  {userPoints.toLocaleString()} pts
                                </span>
                              </div>
                              {canPayWithPoints ? (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                                  ✓ You have enough points to pay for this promotion!
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Need {(requiredPoints - userPoints).toLocaleString()} more points
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!selectedTier || !formData.socialMediaUrl || !formData.engagementType || submitRequestMutation.isPending}
                  >
                    {submitRequestMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : "Submit Request & Download Receipt"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                    <CardTitle className="text-base md:text-lg">Real Engagement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <p className="text-muted-foreground text-xs md:text-sm">
                    All engagement comes from real, active users to ensure authentic growth for your social media presence.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                    <CardTitle className="text-base md:text-lg">Fast Delivery</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <p className="text-muted-foreground text-xs md:text-sm">
                    See results within 24-48 hours of submitting your promotion request.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                    <CardTitle className="text-base md:text-lg">Targeted Growth</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <p className="text-muted-foreground text-xs md:text-sm">
                    Engagement from users interested in your content niche for better conversion rates.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      
      {/* Purchase Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="break-words">Confirm Your Purchase</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review your purchase details before proceeding to payment
            </DialogDescription>
          </DialogHeader>
          
          {purchaseDetails && (
            <div className="space-y-4 md:space-y-6 py-2 md:py-4">
              {/* Client Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">CLIENT INFORMATION</h3>
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-1 text-xs sm:text-sm">
                  <p className="break-words"><span className="font-medium">Name:</span> {purchaseDetails.clientName}</p>
                  <p className="break-words"><span className="font-medium">Email:</span> {purchaseDetails.clientEmail}</p>
                  <p className="break-words"><span className="font-medium">Member Since:</span> {purchaseDetails.membershipDate}</p>
                </div>
              </div>
              
              {/* Purchase Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">PURCHASE DETAILS</h3>
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-1 text-xs sm:text-sm">
                  <p className="break-words"><span className="font-medium">Plan:</span> {purchaseDetails.planName}</p>
                  <p className="break-words"><span className="font-medium">Base Package:</span> {purchaseDetails.baseEngagementCount.toLocaleString()} engagements @ ${purchaseDetails.basePrice.toFixed(2)}</p>
                  <p className="break-words"><span className="font-medium">Requested:</span> {purchaseDetails.customEngagementCount.toLocaleString()} engagements</p>
                  <p className="break-words"><span className="font-medium">Engagement Type:</span> {purchaseDetails.engagementType}</p>
                  <p className="break-all"><span className="font-medium">Social Media URL:</span> {purchaseDetails.socialMediaUrl}</p>
                  {purchaseDetails.additionalDetails && (
                    <p className="break-words"><span className="font-medium">Notes:</span> {purchaseDetails.additionalDetails}</p>
                  )}
                </div>
              </div>
              
              {/* Pricing Breakdown */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">PRICING BREAKDOWN</h3>
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-1 text-xs sm:text-sm">
                  <p className="break-words">
                    <span className="font-medium">Price per 1,000 engagements:</span> ${(purchaseDetails.basePrice / purchaseDetails.baseEngagementCount * 1000).toFixed(2)}
                  </p>
                  <p className="break-words">
                    <span className="font-medium">Multiplier:</span> {(purchaseDetails.customEngagementCount / purchaseDetails.baseEngagementCount).toFixed(2)}x
                  </p>
                  <p className="break-words">
                    <span className="font-medium">Calculation:</span> ${purchaseDetails.basePrice.toFixed(2)} × {(purchaseDetails.customEngagementCount / purchaseDetails.baseEngagementCount).toFixed(2)} = ${purchaseDetails.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Total Amount */}
              <div className="bg-primary/10 p-3 md:p-4 rounded-lg border-2 border-primary">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-sm sm:text-base md:text-lg font-semibold">TOTAL AMOUNT:</span>
                  <span className="text-2xl sm:text-3xl font-bold text-primary">${purchaseDetails.totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Pay with Points Option */}
              {(() => {
                const requiredPoints = calculateRequiredPoints(purchaseDetails.totalPrice);
                const canPayWithPoints = userPoints >= requiredPoints;
                
                return (
                  <div className={`p-3 md:p-4 rounded-lg border-2 ${canPayWithPoints ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-dashed border-muted-foreground/30 bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className={`w-5 h-5 ${canPayWithPoints ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${canPayWithPoints ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                        Pay with Points Option
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs text-muted-foreground">Points required:</span>
                      <span className={`text-lg font-bold ${canPayWithPoints ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {requiredPoints.toLocaleString()} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Your balance:</span>
                      <span className={`text-sm font-medium ${canPayWithPoints ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                        {userPoints.toLocaleString()} pts
                      </span>
                    </div>
                    {canPayWithPoints ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                        ✓ You can use your points instead of paying with card!
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">
                        You need {(requiredPoints - userPoints).toLocaleString()} more points to use this option
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={checkoutMutation.isPending || payWithPointsMutation.isPending}
              className="w-full sm:w-auto text-xs sm:text-sm"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadReceipt}
              disabled={checkoutMutation.isPending || payWithPointsMutation.isPending}
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              Download Receipt
            </Button>
            {/* Pay with Points Button - only show if user has enough points */}
            {purchaseDetails && userPoints >= calculateRequiredPoints(purchaseDetails.totalPrice) && (
              <Button
                variant="default"
                onClick={() => payWithPointsMutation.mutate()}
                disabled={checkoutMutation.isPending || payWithPointsMutation.isPending}
                className="w-full sm:w-auto gap-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {payWithPointsMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
                    Pay with Points
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending || payWithPointsMutation.isPending}
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm"
              size="sm"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  Pay with Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
