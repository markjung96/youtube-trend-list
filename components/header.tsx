"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 다크 모드 hydration 문제 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">YouTube 인기 영상</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (theme === "light") {
                setTheme("dark");
              } else if (theme === "dark") {
                setTheme("system");
              } else {
                setTheme("light");
              }
            }}
            title="테마 변경"
          >
            {theme === "light" ? (
              <Sun className="h-5 w-5" />
            ) : theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
            <span className="sr-only">테마 변경</span>
          </Button>
        </div>
      </div>
    </header>
  );
}




