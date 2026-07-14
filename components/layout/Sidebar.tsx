"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  Share2,
  Settings,
  LogOut,
  ChevronLeft,
  CreditCard,
  Sparkles,
  Megaphone,
  GraduationCap,
  Trophy,
  Store,
  QrCode,
  UserCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";
import NotificationBell from "@/components/NotificationBell";

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  collapsed: boolean;
};

const NavItem = ({ icon, label, href, isActive, collapsed }: NavItemProps) => (
  <Link href={href}>
    <motion.div
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-purple-600 rounded-r-full"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      
      <div className={cn(
        "px-4 py-3 flex items-center transition-all duration-300 cursor-pointer rounded-lg my-1 mx-2 relative overflow-hidden",
        isActive
          ? "text-primary-foreground bg-gradient-to-r from-primary/90 to-purple-600/90 shadow-lg"
          : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/80"
      )}>
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        <motion.div 
          className="w-6 h-6 flex-shrink-0 relative z-10"
          animate={isActive ? { scale: 1.1 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
        
        <AnimatePresence>
          {!collapsed && (
            <motion.span 
              className="ml-3 relative z-10 font-medium"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        
        {isActive && (
          <motion.div
            className="absolute right-2 top-1/2 -translate-y-1/2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Sparkles className="w-4 h-4 text-primary-foreground/70" />
          </motion.div>
        )}
      </div>
    </motion.div>
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const location = pathname;
  const setLocation = (p: string) => router.push(p);
  const { toast } = useToast();
  const { user } = useAuth();
  const username = user?.username || (typeof window !== 'undefined' ? localStorage.getItem("username") : null) || "uniquegram";
  const userEmail = user?.email || (typeof window !== 'undefined' ? localStorage.getItem("email") : null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  const { logoutMutation } = useAuth();

  const handleSignOut = () => {
    // Trigger the logout mutation from auth hook
    logoutMutation.mutate();

    // Close mobile menu if open
    setMobileOpen(false);
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const { settings } = useAppSettings();

  const NavItems = ({ forceShowText = false }: { forceShowText?: boolean }) => {
    const isCollapsedForNav = forceShowText ? false : collapsed;
    
    return (
      <>
        <li>
          <NavItem
            icon={<LayoutDashboard className="w-6 h-6" />}
            label="Dashboard"
            href="/dashboard"
            isActive={location === "/dashboard"}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li data-tutorial="tasks-link">
          <NavItem
            icon={<CheckSquare className="w-6 h-6" />}
            label="Tasks"
            href="/tasks"
            isActive={location === "/tasks"}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li data-tutorial="rewards-link">
          <NavItem
            icon={<Award className="w-6 h-6" />}
            label="Rewards"
            href="/rewards"
            isActive={location === "/rewards"}
            collapsed={isCollapsedForNav}
          />
        </li>
        {settings.leaderboard_enabled && (
          <li>
            <NavItem
              icon={<Trophy className="w-6 h-6" />}
              label="Leaderboard"
              href="/leaderboard"
              isActive={location === "/leaderboard"}
              collapsed={isCollapsedForNav}
            />
          </li>
        )}
        {settings.classroom_enabled && (
          <li>
            <NavItem
              icon={<GraduationCap className="w-6 h-6" />}
              label="Classroom"
              href="/classroom"
              isActive={location === "/classroom"}
              collapsed={isCollapsedForNav}
            />
          </li>
        )}
        <li data-tutorial="referral-link">
          <NavItem
            icon={<Share2 className="w-6 h-6" />}
            label="Referral"
            href="/referral"
            isActive={location === "/referral"}
            collapsed={isCollapsedForNav}
          />
        </li>
        {settings.promote_me_enabled && (
          <li>
            <NavItem
              icon={<Megaphone className="w-6 h-6" />}
              label="Promote Me"
              href="/promote-me"
              isActive={location === "/promote-me"}
              collapsed={isCollapsedForNav}
            />
          </li>
        )}
        <li>
          <NavItem
            icon={<Store className="w-6 h-6" />}
            label="Marketplace"
            href="/marketplace"
            isActive={location === "/marketplace"}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li>
          <NavItem
            icon={<QrCode className="w-6 h-6" />}
            label="Tools"
            href="/tools"
            isActive={location === "/tools"}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li>
          <NavItem
            icon={<CreditCard className="w-6 h-6" />}
            label="Payments"
            href="/payments"
            isActive={location === "/payments"}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li>
          <NavItem
            icon={<UserCircle className="w-6 h-6" />}
            label="My Profile"
            href={`/profile/${username}`}
            isActive={location === `/profile/${username}`}
            collapsed={isCollapsedForNav}
          />
        </li>
        <li data-tutorial="settings-link">
          <NavItem
            icon={<Settings className="w-6 h-6" />}
            label="Settings"
            href="/settings"
            isActive={location === "/settings"}
            collapsed={isCollapsedForNav}
          />
        </li>
      </>
    );
  };

  // Unified Logo Component
  const LogoComponent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex items-center">
      <motion.div 
        className="w-10 h-10 flex items-center justify-center shadow-lg rounded-full overflow-hidden"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <img 
          src="/logo.png" 
          alt="Social Growth Logo" 
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-full h-full rounded-full flex items-center justify-center">
          <img 
            src="/4lo4lo-logo.png" 
            alt="4lo4lo Logo" 
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </motion.div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span 
            className="ml-3 font-semibold text-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            Social Growth
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  // Unified User Info Component
  const UserInfoComponent = ({ collapsed = false, isMobile = false }: { collapsed?: boolean; isMobile?: boolean }) => (
    <div className="p-4 border-t border-border">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center text-xs font-medium"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <span>{username.substring(0, 2).toUpperCase()}</span>
          </motion.div>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div 
              className="ml-3 overflow-hidden"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium truncate">{username}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail || 'Free Plan'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={cn(
        "mt-4",
        collapsed ? "flex justify-center" : ""
      )}>
        <motion.button
          className="flex items-center text-sm hover:text-foreground transition-colors group text-[#ffffff] bg-[#964aee] ml-[15px] mr-[15px] px-4 py-2 rounded-lg"
          onClick={handleSignOut}
          title="Sign out"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-4 h-4 group-hover:text-foreground transition-colors" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span 
                className="ml-2"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.2 }}
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );

  // Mobile layout with bottom navigation and top header
  if (isMobile) {
    return (
      <>
        {/* Mobile Top Header with Logo and Notifications */}
        <MobileHeader />
        
        {/* Top padding for fixed header with safe area */}
        <div 
          className="md:hidden"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)",
          }}
        />
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

      </>
    );
  }

  // Desktop sidebar with unified content
  return (
    <motion.div 
      className={cn(
        "bg-gradient-to-b from-background via-background/98 to-background/95 border-r border-border/50 flex flex-col h-full transition-all duration-300 shadow-lg backdrop-blur-sm",
        collapsed ? "w-20" : "w-64"
      )}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-tutorial="sidebar"
    >
      {/* Logo Area with notifications and collapse toggle */}
      <div className="p-4 flex items-center justify-between border-b border-border/30">
        <LogoComponent collapsed={collapsed} />
        
        <div className="flex items-center gap-1">
          <NotificationBell className={collapsed ? "" : ""} />
          
          <motion.button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 flex-1 px-2">
        <ul>
          <NavItems />
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className={cn(
        "border-t border-border/30 py-3",
        collapsed ? "flex justify-center" : "px-4"
      )}>
        <ThemeToggle />
      </div>

      {/* User Info */}
      <UserInfoComponent collapsed={collapsed} />
    </motion.div>
  );
}