"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings, Building2, Search, Save, FlaskConical } from "lucide-react";
import Tooltip from "../components/Tooltip";
import { GLOSSARY } from "@/lib/glossary";

interface CompanyInfo {
  name?: string;
  businessType?: string;
  registrationNumber?: string;
  accountingStandard?: string;
  fiscalYear?: string;
  employeeCount?: string;
  notes?: string;
}

interface SettingsState {
  hasSerperKey: boolean;
  hasSerpApiKey: boolean;
  serperKeyPreview: string | null;
  serpApiKeyPreview: string | null;
  companyInfo: CompanyInfo | null;
  updatedAt: string | null;
}

export default function SettingsPage() {
  const [state, setState] = useState<SettingsState>({
    hasSerperKey: false,
    hasSerpApiKey: false,
    serperKeyPreview: null,
    serpApiKeyPreview: null,
    companyInfo: null,
    updatedAt: null,
  });
  const [serperKey, setSerperKey] = useState("");
  const [serpApiKey, setSerpApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Company info form
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [accStandard, setAccStandard] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [empCount, setEmpCount] = useState("");
  const [companyNotes, setCompanyNotes] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/team-settings");
    if (res.ok) {
      const data = await res.json();
      setState(data);
      // Populate company info form
      if (data.companyInfo) {
        setCompanyName(data.companyInfo.name || "");
        setBusinessType(data.companyInfo.businessType || "");
        setRegNumber(data.companyInfo.registrationNumber || "");
        setAccStandard(data.companyInfo.accountingStandard || "");
        setFiscalYear(data.companyInfo.fiscalYear || "");
        setEmpCount(data.companyInfo.employeeCount || "");
        setCompanyNotes(data.companyInfo.notes || "");
      }
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const body: Record<string, string> = {};
    if (serperKey) body.serperApiKey = serperKey;
    if (serpApiKey) body.serpApiKey = serpApiKey;

    const res = await fetch("/api/team-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setSerperKey("");
      setSerpApiKey("");
      await loadSettings();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClear = async (which: "serper" | "serpapi") => {
    await fetch("/api/team-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(which === "serper" ? { serperApiKey: "" } : { serpApiKey: "" }),
    });
    await loadSettings();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/team-websearch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "test search openclaw" }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setTestResult({ ok: true, message: `ค้นหาสำเร็จ — ${data.results.length} ผลลัพธ์ (ใช้ ${data.source})` });
      } else {
        setTestResult({ ok: false, message: `${data.error ?? "ไม่พบผลลัพธ์ — ตรวจสอบ API key"}` });
      }
    } catch {
      setTestResult({ ok: false, message: "เกิดข้อผิดพลาด ไม่สามารถเชื่อมต่อได้" });
    }
    setTesting(false);
  };

  const handleCompanySave = async () => {
    setCompanySaving(true);
    setCompanySaved(false);
    const companyInfo: CompanyInfo = {
      name: companyName || undefined,
      businessType: businessType || undefined,
      registrationNumber: regNumber || undefined,
      accountingStandard: accStandard || undefined,
      fiscalYear: fiscalYear || undefined,
      employeeCount: empCount || undefined,
      notes: companyNotes || undefined,
    };
    const res = await fetch("/api/team-settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyInfo }),
    });
    setCompanySaving(false);
    if (res.ok) {
      setCompanySaved(true);
      await loadSettings();
      setTimeout(() => setCompanySaved(false), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Settings size={20} style={{ color: "var(--accent)" }} />
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>ตั้งค่าระบบ</h1>
      </div>
      <p className="text-sm mb-6 sm:mb-8" style={{ color: "var(--text-muted)" }}>เพิ่มข้อมูลบริษัทเพื่อให้ AI ให้คำแนะนำที่ถูกต้อง</p>

      {/* Company Info Section */}
      <div className="rounded-xl border p-4 sm:p-6 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} style={{ color: "var(--text-muted)" }} />
          <h2 className="text-base font-semibold">ข้อมูลบริษัท</h2>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          AI Agents จะใช้ข้อมูลนี้ประกอบการวิเคราะห์ทุกครั้งที่เริ่มประชุม
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">ชื่อบริษัท <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              type="text"
              placeholder="เช่น บริษัท ABC จำกัด"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ประเภทธุรกิจ</label>
            <input
              type="text"
              placeholder="เช่น ผลิตและจำหน่ายอาหาร"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">เลขทะเบียนนิติบุคคล</label>
            <input
              type="text"
              placeholder="เช่น 0105555000001"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-1">
              <span>มาตรฐานบัญชี</span>
              <Tooltip content={`${GLOSSARY.npaes?.long ?? ""} · ${GLOSSARY.paes?.long ?? ""}`}>
                <span className="text-[10px] px-1.5 py-0.5 rounded border cursor-help font-normal" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>?</span>
              </Tooltip>
            </label>
            <select
              value={accStandard}
              onChange={(e) => setAccStandard(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            >
              <option value="">— เลือก —</option>
              <option value="NPAEs">NPAEs (กิจการไม่มีส่วนได้เสียสาธารณะ)</option>
              <option value="PAEs">PAEs (กิจการมีส่วนได้เสียสาธารณะ)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ปีการเงิน</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            >
              <option value="">— เลือก —</option>
              <option value="มกราคม - ธันวาคม">มกราคม - ธันวาคม</option>
              <option value="เมษายน - มีนาคม">เมษายน - มีนาคม</option>
              <option value="กรกฎาคม - มิถุนายน">กรกฎาคม - มิถุนายน</option>
              <option value="ตุลาคม - กันยายน">ตุลาคม - กันยายน</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">จำนวนพนักงาน</label>
            <select
              value={empCount}
              onChange={(e) => setEmpCount(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
            >
              <option value="">— เลือก —</option>
              <option value="1-10 คน">1-10 คน</option>
              <option value="11-50 คน">11-50 คน</option>
              <option value="51-200 คน">51-200 คน</option>
              <option value="201-500 คน">201-500 คน</option>
              <option value="500+ คน">500+ คน</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">หมายเหตุเพิ่มเติม</label>
          <textarea
            placeholder="ข้อมูลเฉพาะที่ต้องการให้ AI รู้ เช่น ได้รับสิทธิ BOI, มีสาขา 3 แห่ง, ใช้ระบบ SAP..."
            value={companyNotes}
            onChange={(e) => setCompanyNotes(e.target.value)}
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-lg resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCompanySave}
            disabled={companySaving}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "white",
              opacity: companySaving ? 0.5 : 1,
              cursor: companySaving ? "not-allowed" : "pointer",
            }}
          >
            {companySaving ? "กำลังบันทึก..." : "บันทึกข้อมูลบริษัท"}
          </button>
          {companySaved && <span className="text-sm" style={{ color: "var(--success)" }}>บันทึกสำเร็จ</span>}
        </div>

        {state.companyInfo?.name && (
          <div className="mt-4 px-3 py-2.5 rounded-lg text-xs" style={{ background: "var(--accent-8)", border: "1px solid var(--accent-20)" }}>
            <span className="font-medium" style={{ color: "var(--accent)" }}>ตัวอย่าง Context ที่ AI จะเห็น:</span>
            <p className="mt-1" style={{ color: "var(--text-muted)" }}>
              &quot;บริษัท: {state.companyInfo.name}
              {state.companyInfo.businessType ? ` | ธุรกิจ: ${state.companyInfo.businessType}` : ""}
              {state.companyInfo.accountingStandard ? ` | มาตรฐาน: ${state.companyInfo.accountingStandard}` : ""}
              {state.companyInfo.fiscalYear ? ` | ปีการเงิน: ${state.companyInfo.fiscalYear}` : ""}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Budget & Exchange Rate */}
      <BudgetSection />

      {/* Web Search Section */}
      <div className="rounded-xl border p-4 sm:p-6 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <h2 className="text-base font-semibold">ค้นหาข้อมูลออนไลน์</h2>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          ใช้ค้นหาข้อมูลจากอินเทอร์เน็ตประกอบการวิเคราะห์ของ Agents ที่เปิดใช้งาน Web Search
        </p>

        {/* Serper */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
            <label className="text-sm font-medium">
              Serper API Key
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-15)", color: "var(--accent)" }}>Primary</span>
            </label>
            {state.hasSerperKey && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{state.serperKeyPreview}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--success-15)", color: "var(--success)" }}>✓ บันทึกแล้ว</span>
                <button onClick={() => handleClear("serper")} className="text-xs px-3 py-1.5 rounded" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>ลบ</button>
              </div>
            )}
          </div>
          <input
            type="password"
            placeholder={state.hasSerperKey ? "ใส่ key ใหม่เพื่อเปลี่ยน..." : "f5e5101f..."}
            value={serperKey}
            onChange={(e) => setSerperKey(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            2,500 queries/month ฟรี — <span style={{ color: "var(--accent)" }}>serper.dev</span>
          </p>
        </div>

        {/* SerpApi */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
            <label className="text-sm font-medium">
              SerpApi API Key
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--text-muted-15)", color: "var(--text-muted)" }}>Fallback</span>
            </label>
            {state.hasSerpApiKey && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{state.serpApiKeyPreview}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--success-15)", color: "var(--success)" }}>✓ บันทึกแล้ว</span>
                <button onClick={() => handleClear("serpapi")} className="text-xs px-3 py-1.5 rounded" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>ลบ</button>
              </div>
            )}
          </div>
          <input
            type="password"
            placeholder={state.hasSerpApiKey ? "ใส่ key ใหม่เพื่อเปลี่ยน..." : "1e677b3f..."}
            value={serpApiKey}
            onChange={(e) => setSerpApiKey(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            100 queries/month ฟรี — <span style={{ color: "var(--accent)" }}>serpapi.com</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving || (!serperKey && !serpApiKey)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "white",
              opacity: saving || (!serperKey && !serpApiKey) ? 0.5 : 1,
              cursor: saving || (!serperKey && !serpApiKey) ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>

          <button
            onClick={handleTest}
            disabled={testing || (!state.hasSerperKey && !state.hasSerpApiKey)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              opacity: testing || (!state.hasSerperKey && !state.hasSerpApiKey) ? 0.5 : 1,
              cursor: testing || (!state.hasSerperKey && !state.hasSerpApiKey) ? "not-allowed" : "pointer",
            }}
          >
            {testing ? "กำลังทดสอบ..." : "ทดสอบ"}
          </button>

          {saved && <span className="text-sm" style={{ color: "var(--success)" }}>บันทึกสำเร็จ</span>}
        </div>

        {testResult && (
          <div className="mt-3 text-sm px-3 py-2 rounded-lg" style={{
            background: testResult.ok ? "var(--success-10)" : "var(--danger-10)",
            border: `1px solid ${testResult.ok ? "var(--success)" : "var(--danger)"}`,
            color: testResult.ok ? "var(--success)" : "var(--danger)",
          }}>
            {testResult.message}
          </div>
        )}

        {state.updatedAt && (
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            อัปเดตล่าสุด: {new Date(state.updatedAt).toLocaleString("th-TH")}
          </p>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border p-4 sm:p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold mb-3">วิธีใช้งาน Web Search</h3>
        <ol className="text-xs space-y-1.5" style={{ color: "var(--text-muted)" }}>
          <li>1. บันทึก API Key อย่างน้อย 1 อัน (Serper แนะนำ)</li>
          <li>2. ไปที่ <span style={{ color: "var(--accent)" }}>/agents</span> → แก้ไข Agent → เปิด <strong>Web Search</strong></li>
          <li>3. ใน Research หรือ Meeting Room — Agent ที่เปิด Web Search จะค้นหาข้อมูลก่อนตอบ</li>
        </ol>
      </div>
    </div>
  );
}

function BudgetSection() {
  const [budget, setBudget] = useState("");
  const [rate, setRate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setBudget(localStorage.getItem("monthlyBudgetTHB") ?? "");
      setRate(localStorage.getItem("usdThbRate") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const handleSave = () => {
    try {
      if (budget.trim()) localStorage.setItem("monthlyBudgetTHB", budget.trim());
      else localStorage.removeItem("monthlyBudgetTHB");
      if (rate.trim()) localStorage.setItem("usdThbRate", rate.trim());
      else localStorage.removeItem("usdThbRate");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border p-4 sm:p-6 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Settings size={18} style={{ color: "var(--text-muted)" }} />
        <h2 className="text-base font-semibold">งบประมาณ & อัตราแลกเปลี่ยน</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        กำหนดงบประมาณรายเดือน (ไม่บังคับ) และอัตราแลกเปลี่ยนสำหรับคำนวณค่าใช้จ่าย Token
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium block mb-1">งบประมาณรายเดือน (บาท)</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="เช่น 1000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            เว้นว่างได้ — ถ้าตั้งไว้ หน้า Token จะแสดงแถบเตือนเมื่อใช้ใกล้งบ
          </p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">อัตรา USD → THB</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="36"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            ค่ามาตรฐาน 36 บาท/USD — อัปเดตตามต้องการ
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          บันทึก
        </button>
        {saved && <span className="text-sm" style={{ color: "var(--success)" }}>บันทึกแล้ว ✓</span>}
      </div>
    </div>
  );
}
