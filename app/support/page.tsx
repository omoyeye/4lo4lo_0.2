"use client";
import { MemberLayout, PageHeader } from "@/components/member/kit";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LifeBuoy } from "lucide-react";

function SupportContent() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message,
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: ""
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send support request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MemberLayout>
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <PageHeader icon={LifeBuoy} tone="sky" title="Contact Support" description="Tell us what's wrong and we'll reply by email, usually within a day." />
            </div>
            
            <Card className="mb-6 md:mb-8">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">Submit a Support Request</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Name</label>
                    <Input 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Email</label>
                    <Input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Subject</label>
                    <Input 
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      className="text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Message</label>
                    <Textarea 
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please describe your issue in detail..."
                      className="min-h-[120px] md:min-h-[150px] text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full text-sm gap-2" 
                    disabled={isSubmitting}
                    size="sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQs & Quick Help</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">How do I earn points?</h3>
                  <p className="text-muted-foreground">Complete tasks and engage with social media content to earn points.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">When will I receive my rewards?</h3>
                  <p className="text-muted-foreground">Rewards are processed within 24-48 hours after redemption.</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">How can I check my earnings?</h3>
                  <p className="text-muted-foreground">Visit your dashboard to view your current points and earnings history.</p>
                </div>
              </CardContent>
            </Card>
          </div>
    </MemberLayout>
  );
}




﻿export default function Page() {
  return <SupportContent />;
}

