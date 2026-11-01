"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, AlertCircle, ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const RESEND_SECONDS = 30;

/**
 * Admin sign-in: password, then the 6-digit code emailed to the admin
 * (app/api/admin/login/route.ts, lib/admin-otp.ts).
 */
function AdminLoginContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creds, setCreds] = useState<LoginFormValues | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const post = async (body: Record<string, string>) => {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Admin login failed");
    return data;
  };

  const finish = (data: { username: string }) => {
    toast({ title: "Login successful", description: `Welcome back, ${data.username}!` });
    // Honour ?from= set by the proxy, otherwise land on the admin home.
    const from = new URLSearchParams(window.location.search).get("from");
    router.push(from && from.startsWith("/admin") ? from : "/admin");
    router.refresh();
  };

  // Step 1: password. Either signs in directly (codes off) or emails a code.
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await post(data);
      if (res.step === "code") {
        setCreds(data);
        setChallenge(res.challenge);
        setSentTo(res.sentTo);
        setCode("");
        setCooldown(RESEND_SECONDS);
        return;
      }
      finish(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid admin credentials");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: the emailed code.
  const verify = async (value = code) => {
    if (!creds || !challenge || value.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      finish(await post({ ...creds, challenge, code: value }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (!creds || cooldown > 0) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await post(creds);
      setChallenge(res.challenge);
      setCode("");
      setCooldown(RESEND_SECONDS);
      toast({ title: "New code sent", description: `Check ${res.sentTo}. Older codes no longer work.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send a new code");
    } finally {
      setIsLoading(false);
    }
  };

  const back = () => {
    setChallenge(null);
    setCreds(null);
    setCode("");
    setError("");
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>

          {!challenge ? (
            <>
              <h2 className="text-2xl font-bold text-center mb-2">Admin Portal</h2>
              <p className="text-muted-foreground text-center mb-8">Sign in to access admin controls</p>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Input {...form.register("username")} placeholder="Admin Username" disabled={isLoading} autoComplete="username" />
                  {form.formState.errors.username && <p className="text-sm text-destructive mt-1">{form.formState.errors.username.message}</p>}
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
                  {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
                  <div className="mt-2 text-right">
                    {/* Admins are regular accounts with an admin role, so the site-wide reset flow covers them. */}
                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full py-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> We&apos;ll email you a sign-in code next.
                </p>
              </form>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="space-y-5"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg">
                <MailCheck className="h-7 w-7" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="mt-1 text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{sentTo}</span>. It expires in 10 minutes.
                </p>
              </div>

              <Input
                autoFocus
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6) verify(v);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                aria-label="6-digit code"
                disabled={isLoading}
                className="h-16 text-center font-mono text-3xl tracking-[0.5em]"
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full py-6" disabled={isLoading || code.length !== 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify and sign in
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={back} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={resend} disabled={isLoading || cooldown > 0} className="font-medium text-primary disabled:text-muted-foreground">
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-primary/10 items-center justify-center p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Admin Control Center</h1>
          <p className="text-muted-foreground">Manage users, tasks, and system settings from a centralized dashboard.</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Every admin sign-in is confirmed with a code sent to your email.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <AdminLoginContent />;
}
