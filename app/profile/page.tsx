"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Save, Star, Trash2, User } from "lucide-react";

interface BirthProfile {
  id?: string;
  label?: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timezone: string;
  isDefault?: boolean;
}

const EMPTY: BirthProfile = {
  label: "",
  name: "",
  birthDate: "",
  birthTime: "",
  birthPlace: "",
  timezone: "Asia/Bangkok",
  isDefault: false,
};

export default function ProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [form, setForm] = useState<BirthProfile>(EMPTY);
  const [unknownTime, setUnknownTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    const res = await fetch("/api/birth-profile");
    const data = await res.json();
    const items: BirthProfile[] = (data.profiles ?? []).map(normalizeProfile);
    setProfiles(items);
    const initial = items[0];
    if (initial) selectProfile(initial);
    else newProfile();
    setLoading(false);
  }

  function normalizeProfile(p: any): BirthProfile {
    return {
      id: p.id,
      label: p.label ?? "",
      name: p.name ?? "",
      birthDate: p.birthDate ?? "",
      birthTime: p.birthTime ?? "",
      birthPlace: p.birthPlace ?? "",
      timezone: p.timezone ?? "Asia/Bangkok",
      isDefault: !!p.isDefault,
    };
  }

  function selectProfile(profile: BirthProfile) {
    setSelectedId(profile.id ?? "new");
    setForm(profile);
    setUnknownTime(!profile.birthTime);
    setSaved(false);
    setError("");
  }

  function newProfile() {
    setSelectedId("new");
    setForm({ ...EMPTY, isDefault: profiles.length === 0 });
    setUnknownTime(false);
    setSaved(false);
    setError("");
  }

  const progress = useMemo(() => {
    const checks = [!!form.name, !!form.birthDate, unknownTime || !!form.birthTime, !!form.birthPlace, !!form.timezone];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, unknownTime]);

  function set(k: keyof BirthProfile) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function saveProfile(goToResearch = false) {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = { ...form, birthTime: unknownTime ? "" : form.birthTime };
      const res = await fetch("/api/birth-profile", {
        method: selectedId === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      const items = (data.profiles ?? []).map(normalizeProfile);
      setProfiles(items);
      selectProfile(normalizeProfile(data.profile));
      setSaved(true);
      if (goToResearch) router.push(`/research?profileId=${data.profile.id}`);
      else setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile() {
    if (!form.id || profiles.length <= 1) return;
    setSaving(true);
    const res = await fetch(`/api/birth-profile?id=${encodeURIComponent(form.id)}`, { method: "DELETE" });
    const data = await res.json();
    const items = (data.profiles ?? []).map(normalizeProfile);
    setProfiles(items);
    if (items[0]) selectProfile(items[0]);
    else newProfile();
    setSaving(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile(false);
  }

  const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-5 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)" }}>
              <User size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>สมุดเจ้าชะตา</h1>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                เก็บข้อมูลเกิดของตัวเองหรือคนอื่น แล้วเลือกเจ้าชะตาที่ต้องการไปดูดวงได้ทันที
              </p>
            </div>
          </div>
          <button type="button" onClick={newProfile} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}>
            <Plus size={14} /> เพิ่มคน
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border p-3 h-fit" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>รายชื่อ ({profiles.length})</div>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => selectProfile(profile)}
                className="w-full text-left rounded-xl border px-3 py-2 transition-all"
                style={{
                  borderColor: selectedId === profile.id ? "var(--accent)" : "var(--border)",
                  background: selectedId === profile.id ? "var(--accent-8)" : "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{profile.name}</span>
                  {profile.isDefault && <Star size={12} style={{ color: "var(--accent)" }} />}
                </div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {profile.label || "เจ้าชะตา"} · {profile.birthDate || "ยังไม่ระบุวันเกิด"}
                </div>
                {profile.isDefault && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
                    <Star size={10} /> ใช้เป็นค่าเริ่มต้นในห้องดูดวง
                  </div>
                )}
              </button>
            ))}
            {profiles.length === 0 && (
              <div className="text-xs rounded-xl border px-3 py-4 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                ยังไม่มีข้อมูลเจ้าชะตา
              </div>
            )}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>
              <ArrowRight size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>เลือกเจ้าชะตานี้ไปดูดวง</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                กด “บันทึกแล้วเริ่มดูดวง” เพื่อส่งข้อมูลของคนนี้ไปหน้า /research ระบบจะใช้ชื่อ วันเกิด เวลาเกิด และสถานที่เกิดประกอบคำทำนายทันที
              </p>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
              <span>ความพร้อมของข้อมูล</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--accent)" }} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={<User size={15} />} label="ชื่อที่ต้องการให้เรียก" required>
              <input type="text" value={form.name} onChange={set("name")} required placeholder="เช่น คุณบอส" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} />
            </Field>

            <Field label="ความสัมพันธ์/ป้ายชื่อ">
              <input type="text" value={form.label ?? ""} onChange={set("label")} placeholder="เช่น ตัวฉัน, แฟน, ลูกค้า" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} />
            </Field>

            <Field icon={<CalendarDays size={15} />} label="วันเกิด" required>
              <input type="date" value={form.birthDate} onChange={set("birthDate")} required className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} />
            </Field>

            <Field icon={<Clock3 size={15} />} label="เวลาเกิด">
              <div className="space-y-2">
                <input type="time" value={form.birthTime} onChange={set("birthTime")} disabled={unknownTime} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-45" style={inputStyle} />
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={unknownTime}
                    onChange={(e) => {
                      setUnknownTime(e.target.checked);
                      if (e.target.checked) setForm((f) => ({ ...f, birthTime: "" }));
                    }}
                  />
                  ไม่ทราบเวลาเกิด
                </label>
              </div>
            </Field>

            <Field icon={<MapPin size={15} />} label="สถานที่เกิด">
              <input type="text" value={form.birthPlace} onChange={set("birthPlace")} placeholder="จังหวัด/เมือง/ประเทศ" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} />
            </Field>

            <Field label="Timezone">
              <select value={form.timezone} onChange={set("timezone")} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle}>
                <option value="Asia/Bangkok">Asia/Bangkok</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-xs rounded-xl border px-3 py-2 cursor-pointer" style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}>
            <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            ตั้งเป็นเจ้าชะตาหลัก — เปิดหน้า /research แล้วเลือกคนนี้ให้อัตโนมัติ
          </label>

          {error && <p className="text-xs rounded-xl px-4 py-2.5" style={{ background: "var(--danger-10)", color: "var(--danger)", border: "1px solid var(--danger-30)" }}>{error}</p>}
          {saved && <p className="text-xs rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "var(--success-10)", color: "var(--success)", border: "1px solid var(--success-30)" }}><CheckCircle2 size={14} /> บันทึกข้อมูลเรียบร้อย</p>}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
              <Save size={16} /> {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
            <button type="button" disabled={saving || !form.name || !form.birthDate} onClick={() => saveProfile(true)} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
              บันทึกแล้วเริ่มดูดวง <ArrowRight size={16} />
            </button>
            {form.id && profiles.length > 1 && (
              <button type="button" disabled={saving} onClick={deleteProfile} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer border" style={{ borderColor: "var(--danger-40)", color: "var(--danger)" }}>
                <Trash2 size={16} /> ลบ
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.75 }}>
        ข้อมูลวันเกิดถูกใช้ประกอบการดูดวงภายใน OMNIA.AI เท่านั้น และไม่แสดงให้ผู้ใช้อื่นเห็น
      </p>
    </div>
  );
}

function Field({ icon, label, required, children }: { icon?: React.ReactNode; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
        {icon}
        {label}
        {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
