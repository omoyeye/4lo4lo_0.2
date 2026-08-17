"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle, Settings, LogOut } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DesktopTopBar() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const username =
    user.username ||
    (typeof window !== "undefined"
      ? localStorage.getItem("username")
      : null) ||
    "user";
  const userEmail = user.email;

  return (
    <div className="hidden md:flex items-center justify-end gap-2 px-6 h-14 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <SimpleThemeToggle />
      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/60 transition-colors outline-none">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center text-xs font-semibold">
              {username.substring(0, 2).toUpperCase()}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{username}</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href={`/profile/${username}`}
              className="cursor-pointer gap-2"
            >
              <UserCircle className="h-4 w-4" />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logoutMutation.mutate()}
            className="cursor-pointer gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
