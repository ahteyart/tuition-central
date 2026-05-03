"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  Building2,
  Trophy,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bell,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang-context";
import { translations, type Lang } from "@/lib/i18n";
import type { Role } from "@prisma/client";
import { useState } from "react";

type TranslationKey = keyof (typeof translations)["EN"];

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    labelKey: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  },
  {
    labelKey: "branches",
    href: "/branches",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    labelKey: "students",
    href: "/students",
    icon: GraduationCap,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"],
  },
  {
    labelKey: "teachers",
    href: "/teachers",
    icon: Users,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN"],
  },
  {
    labelKey: "classes",
    href: "/classes",
    icon: BookOpen,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"],
  },
  {
    labelKey: "schedule",
    href: "/schedule",
    icon: Calendar,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    labelKey: "attendance",
    href: "/attendance",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    labelKey: "fees",
    href: "/fees",
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "PARENT"],
  },
  {
    labelKey: "homework",
    href: "/homework",
    icon: FileText,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    labelKey: "results",
    href: "/results",
    icon: Trophy,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    labelKey: "aiTutor",
    href: "/ai",
    icon: Bot,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  },
  {
    labelKey: "messages",
    href: "/messages",
    icon: MessageSquare,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  },
  {
    labelKey: "notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER", "PARENT", "STUDENT"],
  },
  {
    labelKey: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN"],
  },
  {
    labelKey: "settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "CENTRE_ADMIN"],
  },
];

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CENTRE_ADMIN: "Centre Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
};

const dashboardHref: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  CENTRE_ADMIN: "/dashboard/admin",
  TEACHER: "/dashboard/teacher",
  PARENT: "/dashboard/parent",
  STUDENT: "/dashboard/student",
};

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const { lang } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  const tl = translations[lang as Lang] ?? translations["EN"];
  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-blue-900 text-white transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-blue-800">
        {!collapsed && (
          <div>
            <p className="text-lg font-bold text-amber-400">Tuition Central</p>
            <p className="text-xs text-blue-300">{roleLabel[role]}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-blue-800 text-blue-300 hover:text-white ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {filtered.map((item) => {
          const Icon = item.icon;
          const href =
            item.labelKey === "dashboard" ? dashboardHref[role] : item.href;
          const isActive = pathname.startsWith(href);
          const label = tl[item.labelKey] as string;

          return (
            <Link
              key={item.labelKey}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-blue-800">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-blue-300">{roleLabel[role]}</p>
        </div>
      )}
    </aside>
  );
}
