"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";
import Card from "./components/Card";
import { Skeleton, SkeletonCard } from "./components/Skeleton";

interface DashboardData {
  totalAgents: number;
  activeAgents: number;
  totalSessions: number;
  runningSessions: number;
  recentSessions: { id: string; question: string; status: string; startedAt: string; totalTokens: number }[];
  topAgents: { name: string; emoji: string; sessions: number }[];
  availableAgents: { name: string; emoji: string; role: string }[];
  hasBirthProfile: boolean;
  profileName?: string;
}

const READING_TEMPLATES = [
  "ดูดวงวันนี้ ควรระวังอะไรและควรทำอะไร",
  "ดูดวงพรุ่งนี้ มีเรื่องไหนควรเตรียมตัว",
  "ดูดวงภาพรวม 12 เดือนข้างหน้า",
  "ปีนี้การงานและการเงินควรวางแผนอย่างไร",
  "วิเคราะห์ความรักและความสัมพันธ์ช่วงนี้",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authed = authRes.ok;
        setIsGuest(!authed);

        const agentsRes = await fetch("/api/team-agents");
        const agentsData = await agentsRes.json();
        const [sessionsData, statsData, profileData] = authed
          ? await Promise.all([
              fetch("/api/team-research").then((r) => r.json()),
              fetch("/api/agent-stats").then((r) => r.json()),
              fetch("/api/birth-profile").then((r) => r.json()),
            ])
          : [{ sessions: [] }, {}, { profile: null }];

        const agents = agentsData.agents || [];
        const sessions = sessionsData.sessions || [];
        const stats: Record<string, { agentId: string; totalSessions: number }> = statsData || {};
        const agentMap = new Map(agents.map((a: { id: string; name: string; emoji: string }) => [a.id, a]));
        const topAgents = Object.values(stats)
          .sort((a, b) => b.totalSessions - a.totalSessions)
          .slice(0, 5)
          .map((s) => {
            const agent = agentMap.get(s.agentId) as { name: string; emoji: string } | undefined;
            return { name: agent?.name || "Unknown", emoji: agent?.emoji || "✦", sessions: s.totalSessions };
          });

        setData({
          totalAgents: agents.length,
          activeAgents: agents.filter((a: { active: boolean }) => a.active).length,
          totalSessions: sessions.length,
          runningSessions: sessions.filter((s: { status: string }) => s.status === "running").length,
          recentSessions: sessions.slice(0, 5).map((s: { id: string; question: string; status: string; startedAt: string; totalTokens: number }) => ({
            id: s.id,
            question: s.question,
            status: s.status,
            startedAt: s.startedAt,
            totalTokens: s.totalTokens,
          })),
          topAgents,
          availableAgents: agents.slice(0, 5).map((a: { name: string; emoji: string; role?: string }) => ({
            name: a.name,
            emoji: a.emoji,
            role: a.role || "หมอดู",
          })),
          hasBirthProfile: !!profileData.profile,
          profileName: profileData.profile?.name,
        });
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const readiness = useMemo(() => {
    if (!data) return [];
    if (isGuest) {
      return [
        {
          label: "ทดลองได้ทันที",
          ready: true,
          detail: "ถามฟรี 2 คำถามโดยไม่ต้องสมัคร",
          href: "/research",
        },
        {
          label: "เลือกหมอดูอัตโนมัติ",
          ready: data.activeAgents > 0,
          detail: `${Math.min(2, data.activeAgents)}/${data.activeAgents} ท่านสำหรับโหมดทดลอง`,
          href: "/research",
        },
        {
          label: "สมัครเมื่อต้องการถามต่อ",
          ready: false,
          detail: "บันทึกประวัติ ข้อมูลเกิด และเปิดฟีเจอร์เต็ม",
          href: "/register",
        },
      ];
    }
    return [
      {
        label: "ข้อมูลเกิด",
        ready: data.hasBirthProfile,
        detail: data.hasBirthProfile ? `พร้อมอ่านดวงของ ${data.profileName || "คุณ"}` : "ยังไม่ได้กรอกวันเกิดและเวลาเกิด",
        href: "/profile",
      },
      {
        label: "สภาโหราจารย์",
        ready: data.activeAgents > 0,
        detail: `${data.activeAgents}/${data.totalAgents} ท่านพร้อมทำงาน`,
        href: "/agents",
      },
      {
        label: "ประวัติคำทำนาย",
        ready: data.totalSessions > 0,
        detail: data.totalSessions > 0 ? `${data.totalSessions} คำทำนายที่ผ่านมา` : "ยังไม่มีคำทำนาย",
        href: "/research",
      },
    ];
  }, [data, isGuest]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
  };

  const primaryHref = isGuest ? "/research" : data?.hasBirthProfile ? "/research" : "/profile";
  const dailyInsight = useMemo(() => {
    if (isGuest) {
      return {
        tone: "ทดลองฟรี",
        title: "ลองถามหมอดู AI ได้ทันทีโดยไม่ต้องสมัคร",
        body: "ถามได้ 2 คำถามก่อนสมัคร ระบบจะถามข้อมูลเกิดในแชทเมื่อจำเป็น และถ้าถูกใจค่อยสมัครเพื่อเก็บประวัติไว้ถามต่อ",
        action: "เริ่มทดลองถาม",
        href: "/research",
      };
    }
    if (!data?.hasBirthProfile) {
      return {
        tone: "เตรียมดวง",
        title: "กรอกข้อมูลเกิดก่อน แล้ว OMNIA จะเริ่มจำบริบทของคุณ",
        body: "ข้อมูลเกิดคือฐานของทุกคำทำนาย ยิ่งครบเท่าไร คำตอบยิ่งเจาะจงขึ้น",
        action: "ตั้งค่าเจ้าชะตา",
        href: "/profile",
      };
    }
    const latest = data.recentSessions[0]?.question || "";
    if (/งาน|อาชีพ|เลื่อน|ตำแหน่ง|ธุรกิจ/.test(latest)) {
      return {
        tone: "วันนี้ควรจับตา",
        title: "เรื่องงานยังเป็นแกนหลักของช่วงนี้",
        body: "ถ้ามีงานใหม่ ข้อเสนอ หรือแรงกดดันจากผู้ใหญ่ ให้จดรายละเอียดก่อนตอบรับ อย่ารีบตกลงเพราะเกรงใจ",
        action: "ถามต่อเรื่องงาน",
        href: `/research?q=${encodeURIComponent("ช่วงนี้เรื่องงานควรระวังอะไร และควรตัดสินใจอย่างไร")}`,
      };
    }
    if (/เงิน|หนี้|บ้าน|รถ|ลงทุน|รายได้/.test(latest)) {
      return {
        tone: "วันนี้ควรระวัง",
        title: "เงินก้อนและภาระระยะยาวต้องชัดก่อนตัดสินใจ",
        body: "ก่อนรับข้อเสนอหรือใช้เงินก้อน ให้แยกสิ่งที่จำเป็นจริงออกจากสิ่งที่แค่ทำให้อุ่นใจชั่วคราว",
        action: "ถามต่อเรื่องเงิน",
        href: `/research?q=${encodeURIComponent("การเงินช่วงนี้ควรวางแผนและระวังอะไร")}`,
      };
    }
    if (/รัก|สัมพันธ์|แฟน|ครอบครัว|คนใกล้ชิด/.test(latest)) {
      return {
        tone: "วันนี้ควรสังเกต",
        title: "ความสัมพันธ์ต้องการคำพูดที่ชัดกว่าการเดาใจ",
        body: "ถ้ามีเรื่องค้างใจ ให้เลือกคุยตอนอารมณ์นิ่ง และถามให้ชัดว่าอีกฝ่ายต้องการอะไรจริง ๆ",
        action: "ถามต่อเรื่องความสัมพันธ์",
        href: `/research?q=${encodeURIComponent("ความสัมพันธ์ช่วงนี้ควรระวังอะไร")}`,
      };
    }
    return {
      tone: "Daily Insight",
      title: "วันนี้เหมาะกับการทบทวนเป้าหมายหนึ่งเรื่องให้ชัด",
      body: "เลือกหนึ่งเรื่องที่ค้างในใจ แล้วถามแบบเจาะจงพร้อมช่วงเวลา OMNIA จะอ่านได้แม่นกว่าคำถามกว้าง ๆ",
      action: "ดูดวงวันนี้",
      href: `/research?q=${encodeURIComponent("ดูดวงวันนี้ ควรระวังอะไรและควรทำอะไร")}`,
    };
  }, [data, isGuest]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <section className="mb-6 rounded-2xl border p-5 md:p-7" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 text-xs font-semibold mb-3" style={{ color: "var(--accent)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo/TITLELOGO.svg" alt="OMNIA.AI" className="w-16 h-16 object-contain drop-shadow" />
              <span>OMNIA.AI</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold leading-tight" style={{ color: "var(--text)" }}>
              เปิดสภาโหราจารย์ แล้วถามเรื่องชีวิตที่อยากรู้
            </h1>
            <p className="text-sm md:text-base mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {isGuest
                ? "ลองถามก่อนสมัครได้ 2 คำถาม ถ้าถูกใจค่อยสมัครเพื่อเก็บประวัติและข้อมูลเกิดไว้ใช้ต่อ"
                : "กรอกข้อมูลเกิดครั้งเดียว จากนั้นให้โหราจารย์หลายศาสตร์วิเคราะห์ร่วมกันและสรุปเป็นคำตอบที่อ่านง่าย"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:pb-1">
            {!isGuest ? (
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
              >
                <UserCircle size={16} /> ข้อมูลเกิด
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
              >
                สมัครฟรี
              </Link>
            )}
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              {isGuest ? "ทดลองถามฟรี" : data?.hasBirthProfile ? "เริ่มอ่านดวง" : "เริ่มตั้งค่าดวง"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {readiness.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card padding="md" hover>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.ready ? "var(--accent-10)" : "var(--surface)", color: item.ready ? "var(--accent)" : "var(--text-muted)" }}>
                    {item.ready ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.label}</div>
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.detail}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <section className="mb-6 rounded-2xl border p-4 md:p-5" style={{ borderColor: "var(--accent-30)", background: "linear-gradient(135deg, var(--accent-5), color-mix(in srgb, var(--teal) 10%, transparent))" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)" }}>
              <Sparkles size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>{dailyInsight.tone}</div>
              <h2 className="text-base md:text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{dailyInsight.title}</h2>
              <p className="text-sm mt-1 leading-relaxed max-w-3xl" style={{ color: "var(--text-muted)" }}>{dailyInsight.body}</p>
            </div>
          </div>
          <Link
            href={dailyInsight.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)] md:flex-shrink-0"
            style={{ borderColor: "var(--accent-30)", color: "var(--accent)", background: "var(--card)" }}
          >
            {dailyInsight.action}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>คำถามเริ่มต้น</span>
          {READING_TEMPLATES.map((q) => (
            <Link
              key={q}
              href={`/research?q=${encodeURIComponent(q)}`}
              className="text-[11px] px-3 py-1.5 rounded-full border whitespace-nowrap transition-all hover:border-[var(--accent)] flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--card)" }}
            >
              {q}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <MessageSquare size={16} style={{ color: "var(--text-muted)" }} /> {isGuest ? "เริ่มทดลองอย่างไร" : "คำทำนายล่าสุด"}
            </h3>
            <Link href="/research" className="text-xs font-medium" style={{ color: "var(--accent)" }}>เปิดห้องดูดวง</Link>
          </div>
          {isGuest ? (
            <div className="space-y-2">
              {[
                "พิมพ์คำถามที่อยากรู้ เช่น วันนี้ควรระวังอะไร",
                "ระบบจะถามข้อมูลเกิดหรือโฟกัสเพิ่มเมื่อจำเป็น",
                "ถ้าถูกใจ สมัครฟรีเพื่อเก็บประวัติและถามต่อ",
              ].map((text, i) => (
                <div key={text} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--surface)" }}>
                  <span className="min-w-6 h-6 rounded-lg inline-flex items-center justify-center text-[11px] font-bold" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>{i + 1}</span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{text}</p>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data && data.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {data.recentSessions.map((s) => (
                <Link key={s.id} href={`/research?sessionId=${s.id}`} className="block px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--surface)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm truncate flex-1" style={{ color: "var(--text)" }}>{s.question}</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: s.status === "running" ? "var(--success-10)" : "var(--surface)", color: s.status === "running" ? "var(--success)" : "var(--text-muted)" }}>
                      {s.status === "running" ? "กำลังอ่าน" : "เสร็จแล้ว"}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(s.startedAt)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีคำทำนาย ลองเริ่มด้วยคำถามด้านบนได้เลย</p>
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Activity size={16} style={{ color: "var(--text-muted)" }} /> {isGuest ? "หมอดูที่พร้อมให้ลอง" : "โหราจารย์ที่ปรากฏบ่อย"}
            </h3>
            <Link href={isGuest ? "/research" : "/agents"} className="text-xs font-medium" style={{ color: "var(--accent)" }}>{isGuest ? "เริ่มถาม" : "ดูสภา"}</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : isGuest && data && data.availableAgents.length > 0 ? (
            <div className="space-y-2">
              {data.availableAgents.map((agent, i) => (
                <Link key={`${agent.name}-${i}`} href="/research" className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--surface)]">
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.name}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{agent.role}</p>
                  </div>
                  <ArrowRight size={15} style={{ color: "var(--accent)" }} />
                </Link>
              ))}
            </div>
          ) : data && data.topAgents.length > 0 ? (
            <div className="space-y-2">
              {data.topAgents.map((agent, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{agent.sessions} ครั้ง</p>
                  </div>
                  <Users size={16} style={{ color: "var(--accent)" }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>สภาโหราจารย์พร้อมรอคำถามแรก</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
