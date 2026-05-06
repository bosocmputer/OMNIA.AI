"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  Home,
  MessageSquare,
  History,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  Star,
  LogOut,
  LogIn,
  UserPlus,
  UserCog,
  UserCircle,
  MessageSquareText,
  BarChart3,
  CreditCard,
  Coins,
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
      { href: "/history", icon: History, labelKey: "nav.history" },
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

const GUEST_NAV_ITEMS: NavGroup[] = [
  {
    group: "",
    items: [
      { href: "/", icon: Home, labelKey: "nav.dashboard" },
      { href: "/research", icon: MessageSquare, labelKey: "nav.research" },
      { href: "/guide", icon: BookOpen, labelKey: "nav.guide" },
      { href: "/login", icon: LogIn, labelKey: "guest.login" },
      { href: "/register", icon: UserPlus, labelKey: "guest.register" },
    ],
  },
];

function getNavLabel(labelKey: string, t: (key: string) => string) {
  if (labelKey === "guest.login") return "เข้าสู่ระบบ";
  if (labelKey === "guest.register") return "สมัครฟรี";
  return t(labelKey);
}

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
  const [pendingTopups, setPendingTopups] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [billingEnabled, setBillingEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => setUserRole(d?.role ?? "guest"))
      .catch(() => setUserRole("guest"));
  }, []);

  useEffect(() => {
    if (userRole === null || userRole === "guest") return;
    let cancelled = false;
    const loadWallet = async () => {
      try {
        const res = await fetch("/api/billing/wallet?agentCount=5");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setWalletBalance(data.balance ?? 0);
          setBillingEnabled(!!data.billingEnabled);
        }
      } catch {}
    };
    loadWallet();
    const timer = window.setInterval(loadWallet, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "admin") return;
    let cancelled = false;
    const loadPendingTopups = async () => {
      try {
        const res = await fetch("/api/admin/topups?status=pending");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPendingTopups((data.topups ?? []).length);
      } catch {}
    };
    loadPendingTopups();
    const timer = window.setInterval(loadPendingTopups, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userRole]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const EXACT_MATCH_ROUTES = new Set(["/", "/chat"]);
  const isActive = (href: string) =>
    EXACT_MATCH_ROUTES.has(href)
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const isGuest = userRole === "guest";
  const navItems = isGuest ? GUEST_NAV_ITEMS : NAV_ITEMS;
  const mobileCurrent = navItems.flatMap((g) => g.items).find((item) => isActive(item.href));

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  const renderNavLink = (href: string, icon: React.ReactNode, label: string, onNavigate?: () => void, badge?: number) => {
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
        {!collapsed && badge ? (
          <span className="ml-auto min-w-5 h-5 rounded-full px-1.5 text-[11px] font-black inline-flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
        {collapsed && badge ? (
          <span className="absolute right-1 top-1 min-w-4 h-4 rounded-full px-1 text-[9px] font-black inline-flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const renderCreditStatus = (compact = false, onNavigate?: () => void) => {
    if (isGuest) {
      if (compact || collapsed) {
        return (
          <Link
            href="/register"
            onClick={onNavigate}
            title="สมัครฟรีเพื่อเก็บประวัติและถามต่อ"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-[var(--surface)]"
            style={{ borderColor: "var(--accent-25)", color: "var(--accent)" }}
          >
            <UserPlus size={18} />
          </Link>
        );
      }
      return (
        <Link
          href="/register"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors hover:bg-[var(--surface)]"
          style={{ borderColor: "var(--accent-25)", background: "var(--accent-8)" }}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
            <UserPlus size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              ทดลองฟรี
            </span>
            <span className="block truncate text-xs font-semibold" style={{ color: "var(--text)" }}>
              สมัครเพื่อเก็บประวัติ
            </span>
          </span>
        </Link>
      );
    }

    const isAdmin = userRole === "admin";
    const isDemo = billingEnabled === false;
    const href = isDemo ? "/research" : isAdmin ? "/admin/topups" : "/upgrade";
    const title = isDemo ? "Demo mode · ถามฟรี ไม่หักเครดิต" : isAdmin ? "Admin mode · ไม่หักเครดิต" : `เครดิตคงเหลือ ${walletBalance?.toLocaleString() ?? "..."} เครดิต`;

    if (compact || collapsed) {
      return (
        <Link
          href={href}
          onClick={onNavigate}
          title={title}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors hover:bg-[var(--surface)]"
          style={{ borderColor: isDemo ? "var(--accent-25)" : "var(--border)", color: (isAdmin || isDemo) ? "var(--accent)" : "var(--text-muted)" }}
        >
          <Coins size={18} />
          {!isDemo && !isAdmin && walletBalance != null && walletBalance < 49 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} />
          ) : null}
        </Link>
      );
    }

    return (
      <Link
        href={href}
        onClick={onNavigate}
        className="mt-3 flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--accent-25)", background: "var(--accent-8)" }}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
          <Coins size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            {isDemo ? "Demo mode" : isAdmin ? "Admin mode" : "Wallet"}
          </span>
          <span className="block truncate text-xs font-semibold" style={{ color: "var(--text)" }}>
            {isDemo ? "ถามฟรีช่วงทดลอง" : isAdmin ? "ไม่หักเครดิต" : `${walletBalance?.toLocaleString() ?? "..."} เครดิตคงเหลือ`}
          </span>
        </span>
      </Link>
    );
  };

  const renderNavItems = (onNavigate?: () => void) => (
    <div className="space-y-5">
      {navItems.map((group, gi) => (
        <div key={gi}>
          {group.group && !collapsed && (
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t(group.group)}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const label = getNavLabel(item.labelKey, t);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
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
                  {!collapsed && label}
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
            {renderNavLink("/admin/topups", <CreditCard size={20} strokeWidth={isActive("/admin/topups") ? 2.2 : 1.8} style={{ color: isActive("/admin/topups") ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />, "เติมเครดิต", onNavigate, pendingTopups)}
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
                  {mobileCurrent ? getNavLabel(mobileCurrent.labelKey, t) : "ดูดวง AI"}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              {renderCreditStatus(true, () => setMobileMenuOpen(false))}
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
                {renderCreditStatus(false, () => setMobileMenuOpen(false))}
                <div className="h-3" />
                {renderNavItems(() => setMobileMenuOpen(false))}
              </nav>
              <div className="sidebar-footer">
                {isGuest ? (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
                  >
                    <LogIn size={14} />
                    เข้าสู่ระบบ
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
                  >
                    <LogOut size={14} />
                    ออกจากระบบ
                  </button>
                )}
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
              {renderCreditStatus(true)}
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
              {renderCreditStatus()}
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
            {isGuest ? (
              <Link
                href="/login"
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
              >
                <LogIn size={14} />
                เข้าสู่ระบบ
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)]"
              >
                <LogOut size={14} />
                ออกจากระบบ
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Spacer for layout */}
      <div className="hidden md:block" style={{ width: collapsed ? 68 : 240, flexShrink: 0, transition: "width 0.2s" }} />
    </>
  );
}
