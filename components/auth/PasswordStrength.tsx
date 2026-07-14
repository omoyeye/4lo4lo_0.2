"use client";


import { Progress } from "@/components/ui/progress";

export function PasswordStrength({ password }: { password: string }) {
  const calculateStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 25;
    return strength;
  };

  const strength = calculateStrength(password);

  return (
    <div className="space-y-2">
      <Progress value={strength} className="h-2" />
      <p className="text-sm text-muted-foreground">
        {strength === 100 ? "Strong password" : "Password strength: " + strength + "%"}
      </p>
    </div>
  );
}
