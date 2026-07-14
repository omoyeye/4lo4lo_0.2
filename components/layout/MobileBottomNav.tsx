"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  Share2,
  MoreHorizontal,
  Settings,
  LogOut,
  CreditCard,
  Megaphone,
  Moon,
  Sun,
  HelpCircle,
  GraduationCap,
  Trophy,
  Store,
  QrCode,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavTabProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
};

const NavTab = ({ icon, label, href, isActive }: NavTabProps) => (
  <Link href={href}>
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-2 px-3 min-w-[64px] transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground"
      )}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="w-6 h-6"
        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>
      <span className={cn(
        "text-xs mt-1 font-medium",
        isActive && "text-primary"
      )}>
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="bottomNavIndicator"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  </Link>
);

export default function MobileBottomNav() {
  const pathname = usePathname();
  const location = pathname;
  const { user, logoutMutation } = useAuth();
  const { settings } = useAppSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => {
      const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem("theme") : null);
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      if (typeof window !== 'undefined') { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } return 'light';
    }
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    (typeof window !== 'undefined' ? localStorage.setItem("theme", theme) : undefined);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const username = user?.username || (typeof window !== 'undefined' ? localStorage.getItem("username") : null) || "User";

  const handleSignOut = () => {
    logoutMutation.mutate();
    setMoreOpen(false);
  };

  const mainTabs = [
    { icon: <LayoutDashboard className="w-6 h-6" />, label: "Home", href: "/dashboard" },
    { icon: <CheckSquare className="w-6 h-6" />, label: "Tasks", href: "/tasks" },
    { icon: <Award className="w-6 h-6" />, label: "Rewards", href: "/rewards" },
    { icon: <Share2 className="w-6 h-6" />, label: "Referral", href: "/referral" },
  ];

  const moreItems = [
    ...(settings.leaderboard_enabled ? [{ icon: <Trophy className="w-5 h-5" />, label: "Leaderboard", href: "/leaderboard" }] : []),
    ...(settings.classroom_enabled ? [{ icon: <GraduationCap className="w-5 h-5" />, label: "Classroom", href: "/classroom" }] : []),
    ...(settings.promote_me_enabled ? [{ icon: <Megaphone className="w-5 h-5" />, label: "Promote Me", href: "/promote-me" }] : []),
    { icon: <Store className="w-5 h-5" />, label: "Marketplace", href: "/marketplace" },
    { icon: <QrCode className="w-5 h-5" />, label: "Tools", href: "/tools" },
    { icon: <UserCircle className="w-5 h-5" />, label: "My Profile", href: `/profile/${username}` },
    { icon: <CreditCard className="w-5 h-5" />, label: "Payments", href: "/payments" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings" },
    { icon: <HelpCircle className="w-5 h-5" />, label: "Support", href: "/support" },
  ];

  const isMoreActive = ["/leaderboard", "/classroom", "/promote-me", "/marketplace", "/tools", "/payments", "/settings", "/support"].includes(location);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <motion.nav
        className="bg-background/95 backdrop-blur-md border-t border-border shadow-lg"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around px-2">
          {mainTabs.map((tab) => (
            <div key={tab.href} className="relative flex-1">
              <NavTab
                icon={tab.icon}
                label={tab.label}
                href={tab.href}
                isActive={location === tab.href}
              />
            </div>
          ))}
          
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 min-w-[64px] cursor-pointer relative flex-1 transition-colors",
                  isMoreActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-6 h-6"
                  animate={isMoreActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <MoreHorizontal className="w-6 h-6" />
                </motion.div>
                <span className={cn(
                  "text-xs mt-1 font-medium",
                  isMoreActive && "text-primary"
                )}>
                  More
                </span>
                {isMoreActive && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">More Options</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-2">
                {moreItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer",
                        location === item.href
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMoreOpen(false)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </motion.div>
                  </Link>
                ))}
                
                <motion.div
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                </motion.div>
                
                <div className="border-t border-border my-2" />
                
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center text-sm font-medium">
                    {username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{username}</p>
                    <p className="text-sm text-muted-foreground">{user?.email || "Member"}</p>
                  </div>
                </div>
                
                <motion.div
                  className="flex items-center gap-4 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </motion.div>
              </div>
              
              <div className="h-4" />
            </SheetContent>
          </Sheet>
        </div>
      </motion.nav>
    </div>
  );
}
