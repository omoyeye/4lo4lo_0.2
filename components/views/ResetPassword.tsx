"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const router = useRouter();
  const navigate = (p: string) => router.push(p);
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [noToken, setNoToken] = useState(false);

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

  useEffect(() => {
    if (!token) {
      setNoToken(true);
    }
  }, [token]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      return await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "This link may be expired or invalid. Please request a new one.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "No reset token found. Please use the link from your email.",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Password Reset Successful!</CardTitle>
            <CardDescription>
              Your password has been updated. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                A confirmation has been sent to your email. If you didn't make this change, contact support immediately.
              </p>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${noToken ? "bg-amber-100 dark:bg-amber-900" : "bg-primary/10"}`}>
              {noToken
                ? <ShieldAlert className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                : <KeyRound className="h-12 w-12 text-primary" />
              }
            </div>
          </div>
          <CardTitle className="text-2xl">
            {noToken ? "Link Missing Token" : "Reset Your Password"}
          </CardTitle>
          <CardDescription>
            {noToken
              ? "This link appears to be incomplete. Please use the full link from your email."
              : "Enter your new password below. It must be at least 6 characters."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {noToken ? (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Make sure you clicked the full link in your email, or copy and paste the entire URL into your browser.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/forgot-password")}>
                Request New Reset Link
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                Back to Login
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                          disabled={resetPasswordMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                          disabled={resetPasswordMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Back to Login
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
