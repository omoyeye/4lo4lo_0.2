"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
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
  Users,
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
        "flex flex-col items-center justify-center py-2 px-1 min-w-0 transition-colors",
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
  const { menuOn } = useAppSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const username = user?.username || (typeof window !== 'undefined' ? localStorage.getItem("username") : null) || "User";

  const handleSignOut = () => {
    logoutMutation.mutate();
    setMoreOpen(false);
  };

  // Each entry is dropped when a superadmin has switched its menu off (Admin → Menus).
  const mainTabs = [
    { icon: <LayoutDashboard className="w-6 h-6" />, label: "Home", href: "/dashboard", menu: null },
    { icon: <CheckSquare className="w-6 h-6" />, label: "Tasks", href: "/tasks", menu: "tasks" },
    { icon: <Award className="w-6 h-6" />, label: "Rewards", href: "/rewards", menu: "rewards" },
    { icon: <Share2 className="w-6 h-6" />, label: "Referral", href: "/referral", menu: "referral" },
  ].filter((t) => !t.menu || menuOn(t.menu));

  const moreItems = [
    { icon: <Trophy className="w-5 h-5" />, label: "Leaderboard", href: "/leaderboard", menu: "leaderboard" },
    { icon: <GraduationCap className="w-5 h-5" />, label: "Classroom", href: "/classroom", menu: "classroom" },
    { icon: <Megaphone className="w-5 h-5" />, label: "Promote Me", href: "/promote-me", menu: "promote_me" },
    { icon: <Store className="w-5 h-5" />, label: "Marketplace", href: "/marketplace", menu: "marketplace" },
    { icon: <Users className="w-5 h-5" />, label: "Community", href: "/feed", menu: "community" },
    { icon: <QrCode className="w-5 h-5" />, label: "Tools", href: "/tools", menu: "tools" },
    { icon: <UserCircle className="w-5 h-5" />, label: "My Profile", href: `/profile/${username}`, menu: "profile" },
    { icon: <CreditCard className="w-5 h-5" />, label: "Payments", href: "/payments", menu: "payments" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings", menu: null },
    { icon: <HelpCircle className="w-5 h-5" />, label: "Support", href: "/support", menu: "support" },
  ].filter((i) => !i.menu || menuOn(i.menu));

  const isMoreActive = moreItems.some((i) => i.href === location);

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
            <div key={tab.href} className="relative min-w-0 flex-1">
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
                  "flex flex-col items-center justify-center py-2 px-1 min-w-0 cursor-pointer relative flex-1 transition-colors",
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
                <div className="grid grid-cols-3 gap-2">
                  {moreItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}>
                      <motion.div
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors",
                          location === item.href ? "border-purple-300 bg-purple-500/10 text-purple-700 dark:border-purple-800 dark:text-purple-300" : "bg-card hover:bg-muted"
                        )}
                        whileTap={{ scale: 0.96 }}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-purple-600 dark:text-purple-400">
                          {item.icon}
                        </span>
                        <span className="text-xs font-medium leading-tight">{item.label}</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>

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
