"use client";

import { useState, useCallback } from "react";
import {
  Home, CheckSquare, Calendar, BookOpen, Heart, BookMarked,
  BarChart2, User, FileText, Trophy, Settings, LogOut,
  Sparkles, Briefcase, UserCircle, ChevronLeft, ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";

export type Tab =
  | "dashboard" | "daily" | "habits" | "planner" | "academic"
  | "history" | "journal" | "oracle" | "health" | "career"
  | "settings" | "about" | "growth" | "notes" | "profile";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  deepOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard",         icon: Home },
  { id: "daily",     label: "Daily Tracker",      icon: CheckSquare },
  { id: "habits",    label: "Habit Grid",         icon: Trophy },
  { id: "planner",   label: "Planner",            icon: Calendar },
  { id: "academic",  label: "Academic",           icon: BookOpen },
  { id: "health",    label: "Health",             icon: Heart },
  { id: "journal",   label: "Journal",            icon: BookMarked },
  { id: "history",   label: "History & Insights", icon: BarChart2 },
  { id: "profile",   label: "Profile",            icon: User },
  { id: "notes",     label: "Notes",              icon: FileText },
  { id: "growth",    label: "Growth & Vault",     icon: Trophy },
  { id: "career",    label: "Career / Work",      icon: Briefcase },
  { id: "oracle",    label: "Oracle",             icon: Sparkles },
  { id: "about",     label: "About Me",           icon: UserCircle, deepOnly: true },
  { id: "settings",  label: "Settings",           icon: Settings },
];

function LevelBadge() {
  const { level, progressPct } = useRealtimeXP();
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge variant="secondary" className="text-xs font-bold px-2">Lv {level}</Badge>
      <div className="w-8 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

function XPSummaryBar() {
  const { totalXp, level, progressPct, xpToNext } = useRealtimeXP();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-bold">Lv {level}</Badge>
        <span className="text-xs text-muted-foreground">{totalXp.toLocaleString()} XP</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{xpToNext} XP to next level</p>
    </div>
  );
}

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isDeepMode: boolean;
}

export function Sidebar({ activeTab, onTabChange, isDeepMode }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => !item.deepOnly || isDeepMode);

  return (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col border-r bg-background/95 overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-56 lg:w-64",
        isDeepMode ? "border-red-500" : "border-border/40"
      )}
    >
      {/* Header with toggle */}
      <div className={cn(
        "flex items-center border-b border-border/40 px-3 py-3 flex-shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">LifeOS</span>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* XP Summary */}
      <div className={cn("border-b border-border/40 flex-shrink-0", collapsed ? "p-2 flex justify-center" : "p-3")}>
        {collapsed ? <LevelBadge /> : <XPSummaryBar />}
      </div>

      {/* Deep Mode indicator */}
      {isDeepMode && (
        <div className={cn(
          "mx-2 my-2 rounded-md bg-red-500/10 text-red-500 flex-shrink-0",
          collapsed ? "p-1.5 flex justify-center" : "p-2 text-center"
        )}>
          {collapsed
            ? <Shield className="h-3.5 w-3.5" />
            : <p className="text-[10px] font-bold uppercase tracking-wider">Deep Mode Active</p>}
        </div>
      )}

      {/* Nav Items - scrollable */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative group/nav">
              <button
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-muted/80 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.id === "oracle" && (
                      isDeepMode
                        ? <span className="ml-auto text-[10px] text-red-500 font-bold flex-shrink-0">ACTIVE</span>
                        : <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">🔒</span>
                    )}
                  </>
                )}
              </button>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-2 border-t border-border/40 flex-shrink-0">
        <div className="relative group/nav">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={cn(
                "w-full flex items-center rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
              )}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>
          {collapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className="bg-popover text-popover-foreground border border-border shadow-md rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
