"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import Footer from "@/components/layout/Footer";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { Loader2, HelpCircle, RotateCcw, Globe, Lock } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";
import { Switch } from "@/components/ui/switch";

// Profile form schema with social media handles
const profileSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  displayName: z.string().max(160).optional(),
  isPublic: z.boolean().default(true),
  facebook_handle: z.string().optional().nullable(),
  instagram_handle: z.string().optional().nullable(),
  tiktok_handle: z.string().optional().nullable(),
  youtube_handle: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Notification preferences schema — 5 categories aligned with notification-service
const notificationSchema = z.object({
  notifyTaskUpdates: z.boolean(),
  notifyReferralActivity: z.boolean(),
  notifyPayoutUpdates: z.boolean(),
  notifyNewLessons: z.boolean(),
  notifySystemAnnouncements: z.boolean(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

function AccountSettingsTab({ handleDeleteAccount }: { handleDeleteAccount: () => void }) {
  const { startTutorial, resetTutorial, hasCompletedTutorial } = useTutorial();
  const { toast } = useToast();

  const handleReplayTutorial = () => {
    resetTutorial();
    startTutorial();
    toast({
      title: "Tutorial Started",
      description: "Let's walk through the app features again!",
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-semibold">
          Account Settings
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      {/* Tutorial Section */}
      <div className="p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-lg font-semibold">Interactive Tutorial</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto sm:mx-0">
              {hasCompletedTutorial 
                ? "You've completed the tutorial. Want to see it again?"
                : "Take a guided tour to learn how to use the platform effectively."
              }
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 w-full sm:w-auto justify-center"
              onClick={handleReplayTutorial}
              data-testid="replay-tutorial-button"
            >
              <RotateCcw className="w-4 h-4" />
              {hasCompletedTutorial ? "Replay Tutorial" : "Start Tutorial"}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>

        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          className="mt-2"
          data-testid="delete-account-button"
        >
          Delete Account
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const router = useRouter();
  const setLocation = (p: string) => router.push(p);

  // Profile form
  const { user, refetchUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      displayName: user?.displayName || "",
      isPublic: user?.isPublic ?? true,
      facebook_handle: user?.facebook_handle || "",
      instagram_handle: user?.instagram_handle || "",
      tiktok_handle: user?.tiktok_handle || "",
      youtube_handle: user?.youtube_handle || "",
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username || "",
        email: user.email || "",
        displayName: user.displayName || "",
        isPublic: user.isPublic ?? true,
        facebook_handle: user.facebook_handle || "",
        instagram_handle: user.instagram_handle || "",
        tiktok_handle: user.tiktok_handle || "",
        youtube_handle: user.youtube_handle || "",
      });
    }
  }, [user]);

  // Notification form — loads defaults from user.notificationPreferences
  const notifPrefs = (user?.notificationPreferences || {}) as Record<string, boolean>;
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      notifyTaskUpdates: notifPrefs.notifyTaskUpdates ?? true,
      notifyReferralActivity: notifPrefs.notifyReferralActivity ?? true,
      notifyPayoutUpdates: notifPrefs.notifyPayoutUpdates ?? true,
      notifyNewLessons: notifPrefs.notifyNewLessons ?? true,
      notifySystemAnnouncements: notifPrefs.notifySystemAnnouncements ?? true,
    },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          displayName: data.displayName || null,
          isPublic: data.isPublic,
          facebook_handle: data.facebook_handle || null,
          instagram_handle: data.instagram_handle || null,
          tiktok_handle: data.tiktok_handle || null,
          youtube_handle: data.youtube_handle || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      // Refetch user data to update the auth context
      if (refetchUser) {
        await refetchUser();
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [isSavingNotif, setIsSavingNotif] = useState(false);

  const onNotificationSubmit = async (data: NotificationFormValues) => {
    setIsSavingNotif(true);
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      if (refetchUser) await refetchUser();
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotif(false);
    }
  };

  const handleDeleteAccount = () => {
    // Handle account deletion logic here
    toast({
      title: "Account deleted",
      description: "Your account has been permanently deleted.",
      variant: "destructive",
    });
    setLocation("/");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-6 md:mb-8">
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </Button>
            <Button
              variant={activeTab === "notifications" ? "default" : "ghost"}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
              onClick={() => setActiveTab("notifications")}
            >
              Notifications
            </Button>
            <Button
              variant={activeTab === "account" ? "default" : "ghost"}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
              onClick={() => setActiveTab("account")}
            >
              Account
            </Button>
          </div>

          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Profile Settings
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Update your personal information
                </p>
              </div>

              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Username
                    </label>
                    <input
                      {...profileForm.register("username")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {profileForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Email
                    </label>
                    <input
                      {...profileForm.register("email")}
                      type="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="displayName"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Display Name / Bio
                    </label>
                    <textarea
                      {...profileForm.register("displayName")}
                      placeholder="Tell us about yourself..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {profileForm.formState.errors.displayName && (
                      <p className="text-sm text-red-500">
                        {profileForm.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>

                  {/* Public Profile Toggle */}
                  <div className="pt-4 border-t">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {profileForm.watch("isPublic") ? (
                            <Globe className="h-4 w-4 text-primary" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <label className="text-sm font-medium">Public Profile</label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {profileForm.watch("isPublic")
                            ? "Your profile is visible to everyone at /profile/" + (user?.username || "you")
                            : "Your profile is private and hidden from other users"}
                        </p>
                      </div>
                      <Switch
                        checked={profileForm.watch("isPublic")}
                        onCheckedChange={(val) => profileForm.setValue("isPublic", val)}
                        data-testid="switch-is-public"
                      />
                    </div>
                  </div>

                  {/* Social Media Handles Section */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-4">Social Media Handles</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Connect your social media accounts to showcase your profiles
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Facebook */}
                      <div>
                        <label
                          htmlFor="facebook_handle"
                          className="text-sm font-medium leading-none flex items-center gap-2 mb-2"
                        >
                          <SiFacebook className="h-4 w-4 text-blue-600" />
                          Facebook
                        </label>
                        <input
                          {...profileForm.register("facebook_handle")}
                          placeholder="@yourhandle"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="input-facebook-handle"
                        />
                      </div>

                      {/* Instagram */}
                      <div>
                        <label
                          htmlFor="instagram_handle"
                          className="text-sm font-medium leading-none flex items-center gap-2 mb-2"
                        >
                          <SiInstagram className="h-4 w-4 text-pink-600" />
                          Instagram
                        </label>
                        <input
                          {...profileForm.register("instagram_handle")}
                          placeholder="@yourhandle"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="input-instagram-handle"
                        />
                      </div>

                      {/* TikTok */}
                      <div>
                        <label
                          htmlFor="tiktok_handle"
                          className="text-sm font-medium leading-none flex items-center gap-2 mb-2"
                        >
                          <SiTiktok className="h-4 w-4" />
                          TikTok
                        </label>
                        <input
                          {...profileForm.register("tiktok_handle")}
                          placeholder="@yourhandle"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="input-tiktok-handle"
                        />
                      </div>

                      {/* YouTube */}
                      <div>
                        <label
                          htmlFor="youtube_handle"
                          className="text-sm font-medium leading-none flex items-center gap-2 mb-2"
                        >
                          <SiYoutube className="h-4 w-4 text-red-600" />
                          YouTube
                        </label>
                        <input
                          {...profileForm.register("youtube_handle")}
                          placeholder="@yourhandle"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="input-youtube-handle"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="gap-2">
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Notification Preferences
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Choose how you want to be notified
                </p>
              </div>

              <form
                onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}
                className="space-y-6"
              >
                {/* Notification categories */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notification Categories</h3>
                  <div className="rounded-xl border divide-y">
                    {([
                      { field: "notifyTaskUpdates", label: "Task Updates", desc: "When your task submission is approved or rejected" },
                      { field: "notifyReferralActivity", label: "Referral Activity", desc: "When someone joins using your referral link" },
                      { field: "notifyPayoutUpdates", label: "Payout Updates", desc: "When your withdrawal or payout is processed" },
                      { field: "notifyNewLessons", label: "New Lessons", desc: "When new classroom videos are published" },
                      { field: "notifySystemAnnouncements", label: "System Announcements", desc: "Platform updates and important notices" },
                    ] as const).map(({ field, label, desc }) => (
                      <div key={field} className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={notificationForm.watch(field)}
                          onCheckedChange={(val) => notificationForm.setValue(field, val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isSavingNotif}>
                  {isSavingNotif ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Preferences
                </Button>
              </form>
            </div>
          )}

          {/* Account Settings */}
          {activeTab === "account" && (
            <AccountSettingsTab 
              handleDeleteAccount={handleDeleteAccount} 
            />
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}
