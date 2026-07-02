import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Referral from "@/pages/Referral";
import Settings from "@/pages/Settings";
import PromoteMe from "@/pages/PromoteMe";
import NotFound from "@/pages/not-found";
import Terms from "./pages/Terms";
import Privacy from "@/pages/Privacy";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Rewards from "@/pages/Rewards";
import Classroom from "@/pages/Classroom";
import AdminLogin from "@/pages/Auth/AdminLogin";
import AdminDashboard from "@/pages/Admin/Dashboard";
import AdminEmailCenter from "@/pages/Admin/EmailCenter";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/LandingPage";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { Loader2 } from "lucide-react";
import Login from "@/pages/Auth/Login";
import Payments from "@/pages/Payments"; // Import the new Payments component
import Support from "@/pages/Support"; //Import Support page
import Notifications from "@/pages/Notifications";
import SEO from "@/components/SEO"; // Import the SEO component
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { OfflineFallback } from "@/components/OfflineFallback";
import { usePWAAnalytics } from "@/hooks/use-pwa-analytics";
import { initBackgroundSync } from "@/lib/background-sync";
import { TutorialProvider } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { NewUserTutorialPrompt } from "@/components/tutorial/TutorialTrigger";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Marketplace from "@/pages/Marketplace";
import Tools from "@/pages/Tools";
import FreeTools from "@/pages/FreeTools";
import { useAuth } from "@/hooks/use-auth";


// Daily check-in component — updates login streak and awards badges once per session
function DailyCheckin() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const key = `last_checkin_${user.id}`;
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem(key) === today) return;

    fetch("/api/user/checkin", { method: "POST", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          localStorage.setItem(key, today);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  return null;
}

// Admin route protection - verifies with server
function AdminProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify admin status with server
    fetch("/api/admin/status", { 
      credentials: 'include' 
    })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin === true && data.role === 'superadmin');
        setIsLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/tasks" component={Tasks} />
      <ProtectedRoute path="/referral" component={Referral} />
      <ProtectedRoute path="/promote-me" component={PromoteMe} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/rewards" component={Rewards} />
      <ProtectedRoute path="/classroom" component={Classroom} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <Route path="/payments" component={Payments} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/signup/:ref?" component={AuthPage} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/login" component={Login} />
      <Route path="/support" component={Support} />
      <Route path="/profile/:username" component={Profile} />
      <ProtectedRoute path="/leaderboard" component={Leaderboard} />
      <ProtectedRoute path="/marketplace" component={Marketplace} />
      <Route path="/tools" component={Tools} />
      <Route path="/free-tools" component={FreeTools} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin/dashboard" component={() => <AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin/email" component={() => <AdminProtectedRoute component={AdminEmailCenter} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize PWA features
  usePWAAnalytics();
  
  useEffect(() => {
    initBackgroundSync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <WebSocketProvider>
            <AppSettingsProvider>
              <TutorialProvider>
                <SEO /> {/* Global default SEO */}
                <DailyCheckin />
                <Router />
                <Toaster />
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
                <OfflineFallback />
                <TutorialOverlay />
                <NewUserTutorialPrompt />
              </TutorialProvider>
            </AppSettingsProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;