"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

type GoogleSignInButtonProps = {
  className?: string;
};

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const handleGoogleSignIn = () => {
    // Redirect to the Google OAuth route
    window.location.href = "/api/auth/google";
  };

  return (
    <Button
      variant="outline"
      type="button"
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={handleGoogleSignIn}
    >
      <FcGoogle className="h-5 w-5" />
      <span>Sign in with Google</span>
    </Button>
  );
}