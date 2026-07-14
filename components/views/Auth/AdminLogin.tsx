"use client";


import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, AlertCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const router = useRouter();
  const setLocation = (p: string) => router.push(p);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Admin login failed");
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${responseData.username}!`,
      });
      
      // Redirect to admin dashboard - server session handles authentication
      setLocation("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid admin credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-2">
            Admin Portal
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Sign in to access admin controls
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input 
                {...form.register("username")} 
                placeholder="Admin Username" 
                disabled={isLoading}
                autoComplete="username"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            <div>
              <div className="relative">
                <Input 
                  {...form.register("password")} 
                  type={showPassword ? "text" : "password"}
                  placeholder="Password" 
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full py-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Admin Login
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
      
      <div className="hidden lg:flex lg:w-1/2 bg-primary/10 items-center justify-center p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">
            Admin Control Center
          </h1>
          <p className="text-muted-foreground">
            Manage users, tasks, and system settings from a centralized dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
