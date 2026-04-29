"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { ThemeSwitcher } from "@/lib/theme";
import {
  Home,
  MessageSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  Star,
  LogOut,
  UserCog,
  UserCircle,
  MessageSquareText,
  BarChart3,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    group: "",
    items: [
      { href: "/", icon: Home, labelKey: "nav.dashboard" },
    ],
  },
  {
    group: "ดูดวง",
    items: [
      { href: "/research", icon: MessageSquare, labelKey: "nav.research" },
      { href: "/profile", icon: UserCircle, labelKey: "nav.profile" },
    ],
  },
  {
    group: "หมอดู",
    items: [
      { href: "/agents", icon: Users, labelKey: "nav.teamAgents" },
    ],
  },
  {
    group: "ช่วยเหลือ",
    items: [
      { href: "/guide", icon: BookOpen, labelKey: "nav.guide" },
      { href: "/upgrade", icon: Star, labelKey: "nav.upgrade" },
    ],
  },
];

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <Icon
      size={20}
      strokeWidth={active ? 2.2 : 1.8}
      className="flex-shrink-0 transition-colors duration-200"
      style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
    />
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUserRole(d.role ?? null)).catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const EXACT_MATCH_ROUTES = new Set(["/", "/chat"]);
  const isActive = (href: string) =>
    EXACT_MATCH_ROUTES.has(href)
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const mobileCurrent = NAV_ITEMS.flatMap((g) => g.items).find((item) => isActive(item.href));

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  const renderNavLink = (href: string, icon: React.ReactNode, label: string, onNavigate?: () => void) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center rounded-xl text-sm transition-all duration-200 ${
          active ? "text-[var(--accent)] font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
        }`}
        style={{
          padding: collapsed ? "10px 0" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 10,
          minHeight: 44,
          background: active ? "linear-gradient(90deg, var(--accent-15), transparent)" : undefined,
          border: active ? "1px solid var(--accent-20)" : "1px solid transparent",
        }}
      >
        {active && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
        {icon}
        {!collapsed && label}
      </Link>
    );
  };

  const renderNavItems = (onNavigate?: () => void) => (
    <div className="space-y-5">
      {NAV_ITEMS.map((group, gi) => (
        <div key={gi}>
          {group.group && !collapsed && (
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t(group.group)}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? t(item.labelKey) : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center rounded-xl text-sm transition-all duration-200 ${
                    active
                      ? "text-[var(--accent)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                  }`}
                  style={{
                    padding: collapsed ? "10px 0" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? 0 : 10,
                    minHeight: 44,
                    background: active ? "linear-gradient(90deg, var(--accent-15), transparent)" : undefined,
                    border: active ? "1px solid var(--accent-20)" : "1px solid transparent",
                  }}
                >
                  {active && !collapsed && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
                  <NavIcon icon={item.icon} active={active} />
                  {!collapsed && t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {userRole === "admin" && (
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Admin</div>
          )}
          <div className="space-y-0.5">
            {renderNavLink("/admin/analytics", <BarChart3 size={20} strokeWidth={isActive("/admin/analytics") ? 2.2 : 1.8} style={{ color: isActive("/admin/analytics") ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />, "Analytics", onNavigate)}
            {renderNavLink("/admin/topups", <CreditCard size={20} strokeWidth={isActive("/admin/topups") ? 2.2 : 1.8} style={{ color: isActive("/admin/topups") ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />, "เติมเครดิต", onNavigate)}
            {renderNavLink("/admin/users", <UserCog size={20} strokeWidth={isActive("/admin/users") ? 2.2 : 1.8} style={{ color: isActive("/admin/users") ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />, "จัดการผู้ใช้", onNavigate)}
            {renderNavLink("/admin/feedback", <MessageSquareText size={20} strokeWidth={isActive("/admin/feedback") ? 2.2 : 1.8} style={{ color: isActive("/admin/feedback") ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />, "Feedback คำทำนาย", onNavigate)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile header ── */}
      <div className="md:hidden">
        <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
          <div className="h-full px-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center"
              style={{ color: "var(--text)" }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Link href="/" className="flex items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo/TITLELOGO.svg" alt="OMNIA.AI" className="w-10 h-10 object-contain flex-shrink-0 drop-shadow" />
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-wide truncate" style={{ color: "var(--text)" }}>OMNIA.AI</div>
                <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                  {mobileCurrent ? t(mobileCurrent.labelKey) : "ดูดวง AI"}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </header>

        {/* Mobile slide-out drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[55]">
            <button
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            />
            <aside className="absolute top-0 left-0 bottom-0 w-[276px] max-w-[86vw] border-r border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col animate-slide-in">
              <div className="h-14 px-4 border-b border-[var(--border)] flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                {renderNavItems(() => setMobileMenuOpen(false))}
              </nav>
              <div className="sidebar-footer">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
                >
                  <LogOut size={14} />
                  ออกจากระบบ
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar hidden md:flex" style={{ width: collapsed ? 68 : 240 }}>
        {/* Header */}
        <div className="border-b border-[var(--border)]" style={{ padding: collapsed ? "16px 0" : "18px 18px" }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo/TITLELOGO.svg" alt="OMNIA.AI" className="w-11 h-11 object-contain drop-shadow" />
              </Link>
              <button
                onClick={() => setCollapsed(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface)] transition-colors"
                style={{ color: "var(--text-muted)" }}
                title="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/logo/TITLELOGO.svg" alt="OMNIA.AI" className="object-contain flex-shrink-0 drop-shadow" style={{ width: 52, height: 52 }} />
                  <div>
                    <div className="text-lg font-extrabold tracking-wide" style={{ color: "var(--text)" }}>OMNIA.AI</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>ที่ปรึกษาพยากรณ์ AI</div>
                  </div>
                </Link>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 pl-0">
                <LanguageSwitcher />
                <ThemeSwitcher />
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" style={{ padding: collapsed ? "16px 8px" : "16px 12px" }}>
          {renderNavItems()}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="sidebar-footer">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
            >
              <LogOut size={14} />
              ออกจากระบบ
            </button>
          </div>
        )}
      </aside>

      {/* Spacer for layout */}
      <div className="hidden md:block" style={{ width: collapsed ? 68 : 240, flexShrink: 0, transition: "width 0.2s" }} />
    </>
  );
}
