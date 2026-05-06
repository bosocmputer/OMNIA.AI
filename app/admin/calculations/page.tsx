"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Check, Copy, RefreshCw, Search, UserRound } from "lucide-react";

interface BirthProfileOption {
  id: string;
  label?: string | null;
  name: string;
  birthDate: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  timezone?: string | null;
  isDefault: boolean;
  updatedAt: string;
  user: { id: string; username: string; role: string };
}

interface CalculationData {
  profiles: BirthProfileOption[];
  selectedProfileId: string | null;
  birthFacts: Record<string, any> | null;
  calculations: Record<string, any> | null;
  contextText: string;
}

function ValueCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="mt-1 text-sm font-bold break-words" style={{ color: "var(--text)" }}>{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{hint}</div>}
    </div>
  );
}

function PillarCard({ title, pillar }: { title: string; pillar?: Record<string, any> | string | null }) {
  const value = typeof pillar === "string" ? { label: pillar } : pillar;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{title}</div>
      <div className="mt-1 text-base font-black" style={{ color: "var(--text)" }}>{value?.label ?? "-"}</div>
      {value?.stemElement && (
        <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {value.stemElement} {value.stemPolarity} · {value.branchTh} · hidden {Array.isArray(value.hiddenStems) ? value.hiddenStems.join(", ") : "-"}
        </div>
      )}
    </div>
  );
}

export default function AdminCalculationsPage() {
  const [data, setData] = useState<CalculationData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load(profileId = selectedId) {
    setLoading(true);
    setError("");
    const url = profileId ? `/api/admin/calculations?profileId=${encodeURIComponent(profileId)}` : "/api/admin/calculations";
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setData(json);
      setSelectedId(json.selectedProfileId ?? "");
    } else {
      setError(json.error || "โหลดผลคำนวณไม่สำเร็จ");
    }
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  const profiles = data?.profiles ?? [];
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) => [
      profile.name,
      profile.label ?? "",
      profile.birthDate,
      profile.user.username,
      profile.birthPlace ?? "",
    ].join(" ").toLowerCase().includes(q));
  }, [profiles, query]);

  const calculations = data?.calculations ?? null;
  const numerology = calculations?.numerology;
  const taksa = calculations?.taksa;
  const sevenNumber = calculations?.sevenNumber;
  const bazi = calculations?.bazi;

  async function copyContext() {
    if (!data?.contextText) return;
    await navigator.clipboard.writeText(data.contextText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div
        className="rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Calculation Debug</h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>
              ตรวจผลคำนวณที่ OMNIA ส่งให้หมอดูจริง เช่น เลขพื้นฐาน ทักษา เลข 7 ตัว และ BaZi 4 เสา
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load(selectedId)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
          >
            <RefreshCw size={14} /> โหลดใหม่
          </button>
          <button
            type="button"
            onClick={copyContext}
            disabled={!data?.contextText}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "คัดลอกแล้ว" : "Copy Context"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border overflow-hidden lg:sticky lg:top-4 lg:self-start" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา user / ชื่อ / วันเกิด"
                className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
            {filteredProfiles.length === 0 ? (
              <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>ไม่พบ birth profile</div>
            ) : filteredProfiles.map((profile) => {
              const active = profile.id === selectedId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => load(profile.id)}
                  className="w-full text-left p-3 transition-colors hover:bg-[var(--surface)]"
                  style={{ background: active ? "var(--accent-8)" : undefined }}
                >
                  <div className="flex items-start gap-2">
                    <UserRound size={15} className="mt-0.5 flex-shrink-0" style={{ color: active ? "var(--accent)" : "var(--text-muted)" }} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{profile.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                        {profile.user.username} · {profile.birthDate}{profile.birthTime ? ` · ${profile.birthTime}` : ""}
                      </div>
                      {profile.birthPlace && <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{profile.birthPlace}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-4 min-w-0">
          {loading ? (
            <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-muted)" }}>กำลังโหลด...</div>
          ) : error ? (
            <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--danger)", background: "var(--danger-8)", color: "var(--danger)" }}>{error}</div>
          ) : !data?.birthFacts ? (
            <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--text-muted)" }}>ยังไม่มี birth profile ให้ตรวจ</div>
          ) : (
            <>
              <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>ข้อมูลตั้งต้น</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ValueCard label="เจ้าชะตา" value={data.birthFacts.name} hint={data.birthFacts.birthPlace || "ไม่ระบุสถานที่"} />
                  <ValueCard label="วันเกิด" value={`${data.birthFacts.birthDate} (${data.birthFacts.weekdayTh})`} hint={`พ.ศ. ${data.birthFacts.buddhistYear}`} />
                  <ValueCard label="อายุ" value={`${data.birthFacts.age} / ย่าง ${data.birthFacts.nextBirthdayAge}`} hint={data.birthFacts.birthTime || "ไม่ทราบเวลา"} />
                  <ValueCard label="ราศี/นักษัตร" value={`${data.birthFacts.westernZodiac} / ${data.birthFacts.chineseZodiac}`} />
                </div>
              </section>

              <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>เลขพื้นฐาน</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <ValueCard label="เลขเส้นชีวิต" value={`${numerology?.lifePath?.number ?? "-"} · ${numerology?.lifePath?.name ?? ""}`} hint={numerology?.lifePath?.risk} />
                  <ValueCard label="เลขวันเกิด" value={`${numerology?.birthDay?.number ?? "-"} · ${numerology?.birthDay?.name ?? ""}`} hint={numerology?.birthDay?.risk} />
                  <ValueCard label="เลขปีส่วนตัว" value={`${numerology?.personalYear?.number ?? "-"} · ${numerology?.personalYear?.name ?? ""}`} hint={numerology?.personalYear?.risk} />
                </div>
              </section>

              <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>ทักษา / เลข 7 ตัว</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <ValueCard
                    label="ทักษาอายุจร"
                    value={taksa?.currentAgeBase ? `${taksa.weekdayForTaksa} · อายุย่าง ${taksa.ageInThaiReading} · ${taksa.currentAgeBase.base}` : "-"}
                    hint={taksa?.currentAgeBase?.meaning}
                  />
                  <ValueCard
                    label="เลข 7 ตัวพื้นฐาน"
                    value={Array.isArray(sevenNumber?.sevenDigits) ? sevenNumber.sevenDigits.join(" ") : "-"}
                    hint={`ซ้ำ: ${sevenNumber?.repeatedDigits?.map((d: any) => typeof d === "string" ? d : `${d.digit}x${d.count}`).join(", ") || "ไม่มี"} · ขาด: ${sevenNumber?.missingDigits?.map((d: any) => typeof d === "number" ? d : d.digit).join(", ") || "ไม่มี"}`}
                  />
                </div>
              </section>

              <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>BaZi 4 เสา</h2>
                <div className="grid gap-3 md:grid-cols-4">
                  <PillarCard title="Year" pillar={bazi?.year} />
                  <PillarCard title="Month" pillar={bazi?.month} />
                  <PillarCard title="Day" pillar={bazi?.day} />
                  <PillarCard title="Hour" pillar={bazi?.hour} />
                </div>
                <div className="grid gap-3 md:grid-cols-2 mt-3">
                  <ValueCard label="Day Master" value={bazi?.dayMaster ? `${bazi.dayMaster.stem} ${bazi.dayMaster.stemEn} · ${bazi.dayMaster.element} ${bazi.dayMaster.polarity}` : "-"} />
                  <ValueCard
                    label="ธาตุรวมเบื้องต้น"
                    value={bazi?.elementCounts ? Object.entries(bazi.elementCounts).map(([k, v]) => `${k} ${v}`).join(" · ") : "-"}
                    hint={bazi?.caveat}
                  />
                </div>
              </section>

              <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                  <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Context ที่ส่งให้ agent</h2>
                  <button type="button" onClick={copyContext} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "คัดลอกแล้ว" : "Copy"}
                  </button>
                </div>
                <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)", background: "var(--surface)" }}>
                  {data.contextText}
                </pre>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

