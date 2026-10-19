"use client";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  Gift,
  Globe2,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube, SiX, SiTelegram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands",
  "Nigeria", "South Africa", "Kenya", "Ghana", "Egypt", "Morocco", "Tanzania", "Uganda", "Ethiopia", "Zimbabwe",
  "India", "China", "Japan", "South Korea", "Singapore", "Malaysia", "Thailand", "Vietnam", "Philippines", "Indonesia",
  "Brazil", "Mexico", "Argentina", "Colombia", "Chile", "Peru", "Venezuela",
  "Russia", "Poland", "Ukraine", "Czech Republic", "Romania", "Sweden", "Norway", "Denmark", "Finland",
  "New Zealand", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Afghanistan",
  "Saudi Arabia", "UAE", "Turkey", "Israel", "Iran", "Iraq", "Jordan", "Lebanon",
  "Other",
].sort();

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    country: z.string().min(1, "Please select your country"),
    referralCode: z.string().optional(),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the Terms of Service and Privacy Policy to register",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type RegisterFormValues = z.infer<typeof registerSchema>;

type AuthTab = "login" | "register";

/* ────────────────────────────── Page ────────────────────────────── */

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? "";
  const hasReferral = referralCode !== "";
  const [authTab, setAuthTab] = useState<AuthTab>(
    hasReferral || searchParams.get("tab") === "register" ? "register" : "login"
  );
  const { user, isLoading } = useAuth();

  // A signed-in member opening someone's referral link is signed out so they
  // can register the new account; anyone else signed in goes to the dashboard.
  // Signed out in place rather than via logoutMutation, which redirects to
  // /auth and would drop the ?ref= code.
  useEffect(() => {
    if (isLoading || !user) return;
    if (hasReferral) {
      apiRequest("POST", "/api/logout")
        .catch(() => {})
        .finally(() => queryClient.setQueryData<null>(["/api/user"], null));
    } else {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasReferral, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Form side */}
      <div className="relative flex min-h-screen w-full flex-col lg:w-1/2 xl:w-[46%]">
        <MobileHero />

        <header className="hidden items-center justify-between px-10 pt-8 lg:flex">
          <Link href="/" className="flex items-center gap-2.5" aria-label="4lo4lo home">
            <Image src="/logo-128.webp" alt="" width={36} height={36} className="rounded-xl" priority />
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              4LO4LO
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pb-10 pt-6 sm:px-8 lg:items-center lg:px-10 lg:py-10">
          <div className="w-full max-w-[440px]">
            <div className="mb-7 space-y-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={authTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-[2rem]">
                    {authTab === "login" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {authTab === "login"
                      ? "Sign in to pick up your tasks, rewards and streak where you left off."
                      : "Join creators earning points for social tasks, lessons and referrals. Free to join."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {hasReferral && authTab === "register" && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 dark:border-purple-900/60 dark:from-purple-950/40 dark:to-pink-950/30">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-sm">
                  <Gift className="h-[18px] w-[18px]" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">You&apos;ve been invited!</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Referral code <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">{referralCode}</span> is
                    applied. Finish signing up to join.
                  </p>
                </div>
              </div>
            )}

            <TabSwitch value={authTab} onChange={setAuthTab} />

            <div className="mt-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={authTab}
                  initial={{ opacity: 0, x: authTab === "login" ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: authTab === "login" ? 12 : -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {authTab === "login" ? (
                    <LoginForm onSwitch={() => setAuthTab("register")} />
                  ) : (
                    <RegisterForm referralCode={referralCode} onSwitch={() => setAuthTab("login")} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secured with encrypted passwords. We never sell your data.</span>
            </div>
          </div>
        </main>
      </div>

      <BrandPanel />
    </div>
  );
}

/* ────────────────────────────── Brand visuals ────────────────────────────── */

const PERKS = [
  { icon: Coins, title: "Earn points", body: "Complete quick social tasks across every major platform." },
  { icon: GraduationCap, title: "Learn & level up", body: "Free Classroom lessons that pay bonus points." },
  { icon: Users, title: "Refer friends", body: "Grow your tier and unlock cash referral rewards." },
  { icon: Wallet, title: "Cash out", body: "Turn your points into real payouts." },
];

const PLATFORM_ICONS = [SiInstagram, SiTiktok, SiYoutube, SiFacebook, SiX, SiTelegram];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-1/2 xl:w-[54%]">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-white/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-orange-300/25 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/25">
          <Sparkles className="h-4 w-4" />
          A global community for creators & influencers
        </div>

        <div className="grid items-center gap-10 xl:grid-cols-[1fr_minmax(0,300px)]">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
              Grow your socials.
              <br />
              <span className="text-yellow-200">Get rewarded for it.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
              4LO4LO turns the time you already spend on social media into points, skills and real payouts.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {PERKS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-sm leading-snug text-white/75">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[300px] xl:block">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/30">
              <Image
                src="/4lo4lo login bg.webp"
                alt="A creator growing their audience with 4lo4lo"
                width={600}
                height={600}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
            <FloatingCard className="-left-10 top-8" delay={0.2}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Task completed</p>
                <p className="text-[11px] font-medium text-emerald-600">+25 points</p>
              </div>
            </FloatingCard>
            <FloatingCard className="-right-8 bottom-10" delay={0.5}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Level up!</p>
                <p className="text-[11px] font-medium text-purple-600">You reached Level 5</p>
              </div>
            </FloatingCard>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {PLATFORM_ICONS.map((Icon, i) => (
              <div key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <Icon className="h-4 w-4 text-white" />
              </div>
            ))}
          </div>
          <p className="text-sm text-white/80">Free to join · 18+ · No card needed</p>
        </div>
      </div>
    </aside>
  );
}

function FloatingCard({ children, className, delay }: { children: ReactNode; className: string; delay: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn("absolute flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl", className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{ opacity: { delay, duration: 0.4 }, y: { delay, duration: 4, repeat: Infinity, ease: "easeInOut" } }}
    >
      {children}
    </motion.div>
  );
}

/** Small screens get a short branded header instead of the side panel. */
function MobileHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 px-5 pb-12 pt-5 lg:hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }}
      />
      <div className="relative flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="4lo4lo home">
          <Image src="/logo-128.webp" alt="" width={34} height={34} className="rounded-xl ring-2 ring-white/40" priority />
          <span className="text-lg font-extrabold tracking-tight text-white">4LO4LO</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-white/85 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>
      <p className="relative mt-6 text-2xl font-extrabold leading-tight text-white">
        Grow your socials. <span className="text-yellow-200">Get rewarded.</span>
      </p>
      <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-white/85">
        <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Earn points</span>
        <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Learn</span>
        <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Cash out</span>
      </div>
      {/* Rounded lip so the form side overlaps the gradient. */}
      <div className="absolute inset-x-0 -bottom-px h-6 rounded-t-[1.75rem] bg-background" />
    </div>
  );
}

/* ────────────────────────────── Form pieces ────────────────────────────── */

function TabSwitch({ value, onChange }: { value: AuthTab; onChange: (t: AuthTab) => void }) {
  return (
    <div role="tablist" aria-label="Sign in or register" className="relative grid grid-cols-2 rounded-2xl bg-muted p-1.5">
      {(["login", "register"] as const).map((tab) => {
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={cn(
              "relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="auth-tab-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-background shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {tab === "login" ? "Log in" : "Create account"}
          </button>
        );
      })}
    </div>
  );
}

const fieldClass =
  "h-12 rounded-xl border-border/80 bg-background pl-11 text-[15px] shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:ring-offset-0";

function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: typeof User }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input className={cn(fieldClass, className)} {...props} />
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input type={visible ? "text" : "password"} className={cn(fieldClass, "pr-12")} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

function passwordScore(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH = [
  { label: "Too weak", color: "bg-red-500", text: "text-red-500" },
  { label: "Weak", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Fair", color: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" },
  { label: "Good", color: "bg-lime-500", text: "text-lime-600 dark:text-lime-400" },
  { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

function PasswordMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  const s = STRENGTH[score];
  return (
    <div className="mt-2 space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < score ? s.color : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className={cn("font-semibold", s.text)}>{s.label}</span>
        {score < 4 && " · use 8+ characters with upper & lower case, a number and a symbol"}
      </p>
    </div>
  );
}

function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: ReactNode; pendingLabel: string }) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="group h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-[15px] font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-purple-500/40"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  );
}

/* ────────────────────────────── Forgot password ────────────────────────────── */

function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => apiRequest("POST", "/api/auth/forgot-password", data),
    onSuccess: () => {
      setSent(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSent(false);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-sm font-semibold text-purple-600 transition-colors hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          data-testid="link-forgot-password"
        >
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        {sent ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Mail className="h-7 w-7" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle className="text-xl">Check your inbox</DialogTitle>
              <DialogDescription className="text-center">
                If an account exists with that email, a password reset link is on its way. It can take a minute, so
                check your spam or junk folder too.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-6 w-full rounded-xl" onClick={() => setOpen(false)}>
              Back to log in
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md">
                <KeyRound className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl">Reset your password</DialogTitle>
              <DialogDescription>Enter the email on your account and we&apos;ll send you a link to choose a new password.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => forgotPasswordMutation.mutate(d))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <IconInput icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" {...field} data-testid="input-reset-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SubmitButton pending={forgotPasswordMutation.isPending} pendingLabel="Sending...">
                  Send reset link
                </SubmitButton>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────── Login ────────────────────────────── */

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { loginMutation } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Username</FormLabel>
              <FormControl>
                <IconInput icon={User} autoComplete="username" autoCapitalize="none" placeholder="yourusername" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-semibold">Password</FormLabel>
                <ForgotPasswordDialog />
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" placeholder="Enter your password" {...field} data-testid="input-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton pending={loginMutation.isPending} pendingLabel="Logging in...">
          Log in
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          New to 4LO4LO?{" "}
          <button type="button" onClick={onSwitch} className="font-semibold text-purple-600 hover:underline dark:text-purple-400">
            Create a free account
          </button>
        </p>
      </form>
    </Form>
  );
}

/* ────────────────────────────── Register ────────────────────────────── */

function RegisterForm({ referralCode, onSwitch }: { referralCode: string; onSwitch: () => void }) {
  const { registerMutation } = useAuth();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: "",
      referralCode,
      termsAccepted: false,
    },
  });

  const password = useWatch({ control: form.control, name: "password" });
  const confirmPassword = useWatch({ control: form.control, name: "confirmPassword" });
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      username: data.username,
      email: data.email,
      password: data.password,
      country: data.country,
      // The server generates this member's own code; this field is required by the type only.
      referralCode: "",
      ...(data.referralCode ? { referrerCode: data.referralCode } : {}),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Username</FormLabel>
                <FormControl>
                  <IconInput icon={User} autoComplete="username" autoCapitalize="none" placeholder="yourusername" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Country</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-xl border-border/80 shadow-sm focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-0">
                      <div className="flex items-center gap-2.5 text-[15px]">
                        <Globe2 className="h-[18px] w-[18px] text-muted-foreground" />
                        <SelectValue placeholder="Select country" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[260px]">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Email</FormLabel>
              <FormControl>
                <IconInput icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Create a password" {...field} />
              </FormControl>
              <PasswordMeter password={password} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">Confirm password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Repeat your password" {...field} />
              </FormControl>
              {confirmPassword.length > 0 && (
                <p className={cn("flex items-center gap-1.5 text-xs font-medium", passwordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referralCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold">
                Referral code <span className="font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <IconInput icon={Gift} autoCapitalize="none" placeholder="Have a code from a friend?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="rounded-xl border border-border/80 bg-muted/40 p-4">
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="terms-checkbox" className="mt-0.5" />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="terms-checkbox" className="cursor-pointer text-sm font-semibold">
                    I agree to the Terms of Service &amp; Privacy Policy
                  </FormLabel>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    By registering you confirm that you have read and accept our{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                      Privacy Policy
                    </a>
                    . You must be 18 years or older to register.
                  </p>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton pending={registerMutation.isPending} pendingLabel="Creating account...">
          Create account
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          Already a member?{" "}
          <button type="button" onClick={onSwitch} className="font-semibold text-purple-600 hover:underline dark:text-purple-400">
            Log in
          </button>
        </p>
      </form>
    </Form>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
