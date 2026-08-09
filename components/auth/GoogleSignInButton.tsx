"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

type GoogleSignInButtonProps = {
  className?: string;
  /** Where to land after a successful sign-in. */
  callbackUrl?: string;
};

export function GoogleSignInButton({
  className,
  callbackUrl = "/dashboard",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  /*
   * This used to do `window.location.href = "/api/auth/google"`.
   *
   * That is not a NextAuth route. The catch-all at /api/auth/[...nextauth]
   * received "google" as an action name it does not recognise and threw
   * `UnknownAction: Cannot parse action at /api/auth/google` — visible in the
   * Vercel runtime errors for this project. Google sign-in has never worked.
   *
   * signIn() from next-auth/react resolves the correct provider endpoint and
   * carries the CSRF token, which a raw redirect cannot do.
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      // signIn navigates away on success; reaching here means it failed.
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={handleGoogleSignIn}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <FcGoogle className="h-5 w-5" />
      )}
      <span>Sign in with Google</span>
    </Button>
  );
}
