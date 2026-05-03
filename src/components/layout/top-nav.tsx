"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { t, type Lang } from "@/lib/i18n";

interface TopNavProps {
  userName: string;
  unreadCount: number;
}

export function TopNav({ userName, unreadCount }: TopNavProps) {
  const { lang, setLang } = useLang();

  const langs: Lang[] = ["EN", "BM", "CN"];

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-gray-500">
        {t(lang, "welcomeBack")}, <span className="font-semibold text-gray-800">{userName}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 font-medium transition-colors ${
                lang === l
                  ? "bg-blue-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={t(lang, "logout")}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
