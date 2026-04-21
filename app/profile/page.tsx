"use client";
import { useEffect, useState } from "react";
import { Save, User } from "lucide-react";

interface BirthProfile {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timezone: string;
}

const EMPTY: BirthProfile = { name: "", birthDate: "", birthTime: "", birthPlace: "", timezone: "" };

export default function ProfilePage() {
  const [form, setForm] = useState<BirthProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/birth-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setForm({
            name: d.profile.name ?? "",
            birthDate: d.profile.birthDate ?? "",
            birthTime: d.profile.birthTime ?? "",
            birthPlace: d.profile.birthPlace ?? "",
            timezone: d.profile.timezone ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(k: keyof BirthProfile) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/birth-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof BirthProfile, type = "text", placeholder = "", required = false) => (
    <div key={key}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)" }}
        >
          <User size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>โปรไฟล์วันเกิด</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>ข้อมูลนี้ใช้ประกอบการวิเคราะห์ดวงชะตาอัตโนมัติ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>ข้อมูลส่วนตัว</h2>
          {field("ชื่อ-นามสกุล", "name", "text", "ชื่อที่ต้องการให้เรียก", true)}
          {field("วันเกิด", "birthDate", "text", "เช่น 15 มี.ค. 2533 หรือ 15/03/1990", true)}
          {field("เวลาเกิด", "birthTime", "text", "เช่น 14:30 (ไม่บังคับ)")}
          {field("สถานที่เกิด", "birthPlace", "text", "จังหวัด/เมือง/ประเทศ")}
          {field("Timezone", "timezone", "text", "เช่น Asia/Bangkok")}
        </div>

        {error && (
          <p
            className="text-xs rounded-xl px-4 py-2.5"
            style={{ background: "var(--danger-10)", color: "var(--danger)", border: "1px solid var(--danger-30)" }}
          >
            {error}
          </p>
        )}

        {saved && (
          <p
            className="text-xs rounded-xl px-4 py-2.5"
            style={{ background: "var(--success-10)", color: "var(--success)", border: "1px solid var(--success-30)" }}
          >
            ✓ บันทึกข้อมูลเรียบร้อย
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "0 4px 20px var(--accent-20)" }}
        >
          <Save size={16} />
          {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
        </button>
      </form>

      <p className="mt-6 text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
        ⚠️ ข้อมูลวันเกิดถูกเก็บเพื่อใช้ประกอบการดูดวงภายใน OMNIA.AI เท่านั้น — ไม่แชร์กับบุคคลที่สาม
      </p>
    </div>
  );
}
