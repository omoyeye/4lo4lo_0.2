"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => {
      // Get from localStorage or detect from system
      const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem("theme") : null);
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      if (typeof window !== 'undefined') { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } return 'light';
    }
  );

  useEffect(() => {
    // Update DOM and localStorage when theme changes
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    (typeof window !== 'undefined' ? localStorage.setItem("theme", theme) : undefined);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-md"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}