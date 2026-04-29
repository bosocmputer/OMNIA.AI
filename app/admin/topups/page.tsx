"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, XCircle } from "lucide-react";

interface Topup {
  id: string;
  user_id: string;
  username: string | null;
  package_id: string;
  amount_thb: number;
  credits: number;
  status: "pending" | "approved" | "rejected";
  transfer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_META = {
  pending: { label: "รอตรวจ", color: "var(--accent)", icon: Clock3 },
  approved: { label: "อนุมัติแล้ว", color: "var(--green)", icon: CheckCircle2 },
  rejected: { label: "ปฏิเสธ", color: "var(--danger)", icon: XCircle },
};

export default function AdminTopupsPage() {
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const summary = useMemo(() => ({
    pending: topups.filter((item) => item.status === "pending").length,
    approved: topups.filter((item) => item.status === "approved").length,
    rejected: topups.filter((item) => item.status === "rejected").length,
  }), [topups]);

  async function loadTopups() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/topups?status=all");
      if (res.ok) {
        const data = await res.json();
        setTopups(data.topups ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTopups();
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    setReviewingId(id);
    try {
      const res = await fetch("/api/admin/topups", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await loadTopups();
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)", color: "var(--accent)" }}>
            <CreditCard size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>ตรวจรายการเติมเครดิต</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>อนุมัติยอดโอน PromptPay แล้วระบบจะเติมเครดิตให้ผู้ใช้ทันที</p>
          </div>
        </div>
        <button
          onClick={loadTopups}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          โหลดใหม่
        </button>
      </div>

      <section className="grid sm:grid-cols-3 gap-3 mb-6">
        {(["pending", "approved", "rejected"] as const).map((status) => {
          const Icon = STATUS_META[status].icon;
          return (
            <div key={status} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: STATUS_META[status].color }}>
                <Icon size={15} />
                {STATUS_META[status].label}
              </div>
              <div className="mt-2 text-3xl font-black" style={{ color: "var(--text)" }}>{summary[status]}</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>รายการล่าสุด</h2>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : topups.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีรายการเติมเครดิต</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {topups.map((item) => {
              const meta = STATUS_META[item.status];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "var(--border)", color: meta.color }}>
                        <Icon size={13} /> {meta.label}
                      </span>
                      <span className="font-bold" style={{ color: "var(--text)" }}>{item.username || item.user_id}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(item.created_at).toLocaleString("th-TH")}</span>
                    </div>
                    <div className="mt-2 text-sm" style={{ color: "var(--text)" }}>
                      แพ็ก {item.package_id} · {item.amount_thb.toLocaleString()} บาท · {item.credits.toLocaleString()} เครดิต
                    </div>
                    <div className="mt-1 text-xs break-words" style={{ color: "var(--text-muted)" }}>
                      หมายเหตุ: {item.transfer_note || "-"}
                    </div>
                  </div>
                  {item.status === "pending" ? (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => review(item.id, "approved")}
                        disabled={reviewingId === item.id}
                        className="rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-60"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => review(item.id, "rejected")}
                        disabled={reviewingId === item.id}
                        className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-60"
                        style={{ borderColor: "var(--danger-40)", color: "var(--danger)" }}
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      ตรวจโดย {item.reviewed_by || "-"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
