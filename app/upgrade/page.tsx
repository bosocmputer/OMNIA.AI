"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Clock3,
  CreditCard,
  FileText,
  History,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

interface CreditPackage {
  id: string;
  label: string;
  amountTHB: number;
  credits: number;
  desc: string;
}

interface ReadingPrice {
  credits: number;
  label: string;
  desc: string;
}

interface WalletPayload {
  balance: number;
  packages: CreditPackage[];
  readingPrice: ReadingPrice;
  welcomeCredits: number;
  promptPay: { name: string; id: string };
  transactions: CreditTransaction[];
  topups: CreditTopup[];
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  reference: string | null;
  metadata: { question?: string; priceLabel?: string } | null;
  created_at: string;
}

interface CreditTopup {
  id: string;
  package_id: string;
  amount_thb: number;
  credits: number;
  status: "pending" | "approved" | "rejected";
  transfer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const READING_TIERS = [
  { label: "ถามเร็ว", credits: 29, desc: "หมอดู 1-2 ท่าน เหมาะกับคำถามสั้นและตัดสินใจเร็ว" },
  { label: "สภา OMNIA", credits: 59, desc: "หมอดู 3-5 ท่าน พร้อมสรุปจาก OMNIA.AI" },
  { label: "ถามต่อ", credits: 19, desc: "ต่อจากคำทำนายเดิม ไม่ต้องเล่าบริบทซ้ำ" },
];

const PREMIUM_PREVIEWS = [
  { icon: Sparkles, title: "Daily Insight", desc: "เปิดมาแล้วเห็นเรื่องที่ควรทำและควรระวังของวันนี้" },
  { icon: History, title: "Life Timeline", desc: "เก็บคำทำนายเป็นเส้นเวลา เห็นจังหวะซ้ำและเรื่องที่ถูกทักบ่อย" },
  { icon: ShieldCheck, title: "Priority Reading", desc: "คิวอ่านเร็วขึ้นในช่วงที่มีผู้ใช้งานเยอะ" },
];

export default function UpgradePage() {
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("focus");
  const [transferNote, setTransferNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => wallet?.packages.find((item) => item.id === selectedPackage) ?? wallet?.packages[0],
    [selectedPackage, wallet?.packages],
  );
  const pendingTopups = useMemo(
    () => wallet?.topups.filter((item) => item.status === "pending") ?? [],
    [wallet?.topups],
  );

  async function loadWallet() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/wallet?agentCount=5");
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
        if (data.packages?.[1]?.id) setSelectedPackage(data.packages[1].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function createTopup() {
    if (!selected) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: selected.id, transferNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "แจ้งเติมเครดิตไม่สำเร็จ");
      setMessage(`ส่งรายการเติม ${selected.credits.toLocaleString()} เครดิตแล้ว รอผู้ดูแลตรวจสอบยอดโอน`);
      setTransferNote("");
      await loadWallet();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "แจ้งเติมเครดิตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)", color: "var(--accent)" }}
          >
            <Wallet size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>เครดิต OMNIA.AI</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              เติมเครดิตก่อนถาม ใช้ตามจริง ไม่บังคับรายเดือน
              {wallet?.welcomeCredits ? ` · สมาชิกใหม่ได้ ${wallet.welcomeCredits} เครดิตทดลอง` : ""}
            </p>
          </div>
        </div>
        <Link href="/research" className="hidden sm:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          เปิดห้องดูดวง
          <ArrowRight size={15} />
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl border p-6" style={{ borderColor: "var(--accent-30)", background: "linear-gradient(135deg, var(--surface), var(--card))" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Wallet Balance</div>
              <div className="text-4xl font-black" style={{ color: "var(--text)" }}>
                {loading ? "..." : (wallet?.balance ?? 0).toLocaleString()}
                <span className="ml-2 text-base font-semibold" style={{ color: "var(--text-muted)" }}>เครดิต</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-muted)" }}>
                หนึ่งคำถามจะหักเครดิตตามจำนวนหมอดูที่เลือก ระบบจะตรวจเครดิตบน server ก่อนเริ่มอ่านดวงทุกครั้ง
              </p>
              {wallet?.welcomeCredits ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--accent-30)", color: "var(--accent)", background: "var(--accent-8)" }}>
                  <Sparkles size={14} />
                  user ใหม่ได้เครดิตฟรี {wallet.welcomeCredits.toLocaleString()} เครดิต สำหรับทดลองถามเร็ว 1 ครั้ง
                </div>
              ) : null}
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
              <CreditCard size={22} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {READING_TIERS.map((item) => (
              <div key={item.label} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.label}</div>
                <div className="mt-2 text-2xl font-black" style={{ color: "var(--accent)" }}>{item.credits}</div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Step 1</div>
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>เลือกแพ็กเครดิต</h2>
              </div>
              {selected && (
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>เลือกอยู่</div>
                  <div className="font-black" style={{ color: "var(--accent)" }}>{selected.amountTHB.toLocaleString()} บาท</div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              {wallet?.packages.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackage(pack.id)}
                  className="rounded-2xl border p-4 text-left transition-all"
                  style={{
                    borderColor: selectedPackage === pack.id ? "var(--accent)" : "var(--border)",
                    background: selectedPackage === pack.id ? "var(--accent-8)" : "var(--bg)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold" style={{ color: "var(--text)" }}>{pack.label}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{pack.desc}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black" style={{ color: "var(--accent)" }}>{pack.amountTHB.toLocaleString()} บาท</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{pack.credits.toLocaleString()} เครดิต</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <QrCode size={18} style={{ color: "var(--accent)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Step 2-3: โอนแล้วแจ้งตรวจยอด</h2>
          </div>
          <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--accent-25)", background: "var(--accent-8)" }}>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>ชื่อบัญชี</div>
            <div className="font-bold" style={{ color: "var(--text)" }}>{wallet?.promptPay?.name || "OMNIA.AI"}</div>
            <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>PromptPay / เลขอ้างอิง</div>
            <div className="font-mono text-sm" style={{ color: "var(--accent)" }}>{wallet?.promptPay?.id || "ติดต่อทีมงานเพื่อรับ QR"}</div>
          </div>

          <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>ยอดที่ต้องโอน</div>
                <div className="text-2xl font-black" style={{ color: "var(--accent)" }}>
                  {selected ? `${selected.amountTHB.toLocaleString()} บาท` : "เลือกแพ็กเกจ"}
                </div>
              </div>
              {selected && (
                <div className="rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: "var(--accent-30)", color: "var(--text)" }}>
                  {selected.credits.toLocaleString()} เครดิต
                </div>
              )}
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "#fff" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/payments/promptpay-qr.jpg"
                alt="PromptPay QR สำหรับเติมเครดิต OMNIA.AI"
                className="mx-auto w-full max-w-[260px] rounded-xl object-contain"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              สแกน QR แล้วกรอกยอดให้ตรงกับแพ็กที่เลือก จากนั้นใส่เวลาโอนหรือชื่อผู้โอนในช่องหมายเหตุเพื่อให้ตรวจยอดได้เร็วขึ้น
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border p-2" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}>
                ตรวจยอดแบบ manual
                <div className="font-bold mt-0.5" style={{ color: "var(--text)" }}>ปกติ 5-15 นาที</div>
              </div>
              <div className="rounded-xl border p-2" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}>
                เครดิตเข้าเมื่อ
                <div className="font-bold mt-0.5" style={{ color: "var(--text)" }}>admin อนุมัติ</div>
              </div>
            </div>
          </div>

          <label className="block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Step 3: หมายเหตุโอนเงินสำหรับตรวจยอด</label>
          <input
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            placeholder="เช่น โอน 14:32 / ชื่อผู้โอน / 4 ตัวท้ายบัญชี"
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
          />
          <button
            onClick={createTopup}
            disabled={!selected || submitting}
            className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
            แจ้งเติมเครดิต
          </button>
          {message && <p className="mt-3 text-xs leading-relaxed" style={{ color: message.includes("ไม่สำเร็จ") ? "var(--danger)" : "var(--accent)" }}>{message}</p>}
          {pendingTopups.length > 0 && (
            <div className="mt-4 rounded-2xl border p-3 text-xs leading-relaxed" style={{ borderColor: "var(--accent-30)", background: "var(--accent-8)", color: "var(--text-muted)" }}>
              มีรายการรอตรวจยอด {pendingTopups.length} รายการ หากโอนแล้วรอสักครู่ ปกติ admin จะตรวจและเติมเครดิตให้ภายใน 5-15 นาที
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/terms" target="_blank" className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
              <FileText size={13} />
              เงื่อนไขเครดิต/คืนเครดิต
            </Link>
            <Link href="/privacy" target="_blank" className="font-semibold" style={{ color: "var(--accent)" }}>
              นโยบายข้อมูลส่วนบุคคล
            </Link>
            <Link href="/contact" target="_blank" className="font-semibold" style={{ color: "var(--accent)" }}>
              ติดต่อเมื่อโอนผิดยอด
            </Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-3 mt-6">
        {PREMIUM_PREVIEWS.map((item) => (
          <div key={item.title} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
              <item.icon size={18} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.title}</h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 mt-6">
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>ประวัติเครดิต</h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{wallet?.transactions?.length ?? 0} รายการ</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {wallet?.transactions?.length ? wallet.transactions.slice(0, 8).map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {item.type === "reading" ? item.metadata?.priceLabel || "ใช้ถามดวง" : item.type === "welcome" ? "เครดิตฟรีทดลองใช้" : "เติมเครดิต"}
                  </div>
                  <div className="text-xs truncate max-w-[360px]" style={{ color: "var(--text-muted)" }}>
                    {item.metadata?.question || new Date(item.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black" style={{ color: item.amount < 0 ? "var(--danger)" : "var(--accent)" }}>
                    {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>เครดิต</div>
                </div>
              </div>
            )) : (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีประวัติเครดิต</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>รายการเติมเครดิต</h2>
            <button onClick={loadWallet} className="text-xs font-semibold" style={{ color: "var(--accent)" }}>รีเฟรช</button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {wallet?.topups?.length ? wallet.topups.slice(0, 8).map((item) => {
              const statusText = item.status === "pending" ? "รอตรวจยอด" : item.status === "approved" ? "เครดิตเข้าแล้ว" : "ปฏิเสธ";
              const statusColor = item.status === "pending" ? "var(--accent)" : item.status === "approved" ? "var(--green)" : "var(--danger)";
              return (
                <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {item.amount_thb.toLocaleString()} บาท · {item.credits.toLocaleString()} เครดิต
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(item.created_at).toLocaleString("th-TH")} · {item.transfer_note || "ไม่มีหมายเหตุ"}
                    </div>
                    {item.status === "pending" && (
                      <div className="mt-1 text-[11px]" style={{ color: "var(--accent)" }}>
                        ส่งรายการแล้ว รอผู้ดูแลตรวจยอดโอนและเติมเครดิตให้บัญชีนี้
                      </div>
                    )}
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-xs font-semibold flex-shrink-0" style={{ borderColor: statusColor, color: statusColor }}>
                    {statusText}
                  </span>
                </div>
              );
            }) : (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีรายการเติมเครดิต</div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border p-4 flex items-start gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <CheckCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Step 4 คือรอผู้ดูแลตรวจยอด PromptPay แบบ manual ก่อน เครดิตจะเข้าเมื่อรายการได้รับอนุมัติ อ่านรายละเอียดเพิ่มเติมได้ที่{" "}
          <Link href="/terms" className="font-semibold underline" style={{ color: "var(--accent)" }}>เงื่อนไขการใช้งาน</Link>
          {" "}และ{" "}
          <Link href="/privacy" className="font-semibold underline" style={{ color: "var(--accent)" }}>นโยบายความเป็นส่วนตัว</Link>
        </p>
      </div>
    </div>
  );
}
