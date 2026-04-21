"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { UsersRound, MessageSquare, Pencil, Trash2, Plus, MoreHorizontal, X, ArrowRight, Sparkles } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  active: boolean;
}

interface Team {
  id: string;
  name: string;
  emoji: string;
  description: string;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = { name: "", emoji: "👥", description: "", agentIds: [] as string[] };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, ar] = await Promise.all([
        fetch("/api/teams").then((r) => r.json()),
        fetch("/api/team-agents").then((r) => r.json()),
      ]);
      setTeams(tr.teams ?? []);
      setAgents((ar.agents ?? []).filter((a: Agent) => a.active));
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditTarget(team);
    setForm({ name: team.name, emoji: team.emoji, description: team.description, agentIds: [...team.agentIds] });
    setError("");
    setMenuOpen(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditTarget(null);
  };

  const toggleAgent = (id: string) => {
    setForm((f) => ({
      ...f,
      agentIds: f.agentIds.includes(id) ? f.agentIds.filter((x) => x !== id) : [...f.agentIds, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("กรุณาใส่ชื่อ Team"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editTarget ? `/api/teams/${editTarget.id}` : "/api/teams";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "บันทึกไม่สำเร็จ");
      }
      await fetchAll();
      setShowModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      await fetchAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const agentById = (id: string) => agents.find((a) => a.id === id);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
                ทีมที่ปรึกษา
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                จัดกลุ่ม AI agents เข้าห้องประชุมเพื่อถกเถียงร่วมกัน
              </p>
            </div>
            <button
              onClick={openCreate}
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">สร้าง Team</span>
              <span className="sm:hidden">สร้าง</span>
            </button>
          </div>

          {/* Stats bar */}
          {!loading && teams.length > 0 && (
            <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <UsersRound size={13} />
                {teams.length} ทีม
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare size={13} />
                {teams.reduce((sum, t) => sum + t.agentIds.length, 0)} agents ทั้งหมด
              </span>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && !showModal && (
          <div className="border border-red-500/40 bg-red-500/10 rounded-xl px-4 py-3 text-sm text-red-400 mb-5 flex items-center justify-between animate-in">
            <span>{error}</span>
            <button className="opacity-60 hover:opacity-100 ml-3" onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border p-5 animate-pulse"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="w-12 h-12 rounded-xl mb-4" style={{ background: "var(--border)" }} />
                <div className="h-4 w-2/3 rounded mb-2" style={{ background: "var(--border)" }} />
                <div className="h-3 w-full rounded mb-4" style={{ background: "var(--border)" }} />
                <div className="flex gap-1">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-7 h-7 rounded-full" style={{ background: "var(--border)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && teams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center animate-in">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--accent-10)" }}
            >
              <UsersRound size={36} style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
              ยังไม่มีทีม
            </h2>
            <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
              สร้างทีม AI ที่ปรึกษา แล้วเริ่มห้องประชุมเพื่อถกเถียงหาคำตอบร่วมกัน
            </p>
            <button
              onClick={openCreate}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              <Plus size={16} />
              สร้าง Team แรก
            </button>
          </div>
        )}

        {/* ── Team Cards Grid ── */}
        {!loading && teams.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const teamAgents = team.agentIds.map(agentById).filter(Boolean) as Agent[];
              const isDeleting = deleteConfirm === team.id;

              return (
                <div
                  key={team.id}
                  className="group relative rounded-2xl border p-4 sm:p-5 flex flex-col transition-all hover:border-[var(--accent-40)] animate-in"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  {/* Delete overlay */}
                  {isDeleting && (
                    <div className="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>ลบทีมนี้?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-1.5 rounded-lg text-xs border"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="px-4 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                        >
                          ลบเลย
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card top: Emoji + menu */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: "var(--accent-10)" }}
                    >
                      {team.emoji}
                    </div>

                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === team.id ? null : team.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all sm:opacity-40"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpen === team.id && (
                        <div
                          className="absolute right-0 top-8 z-20 w-36 rounded-xl border py-1 shadow-xl animate-in"
                          style={{ borderColor: "var(--border)", background: "var(--card)" }}
                        >
                          <button
                            onClick={() => openEdit(team)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--accent-8)]"
                            style={{ color: "var(--text)" }}
                          >
                            <Pencil size={12} /> แก้ไข
                          </button>
                          <button
                            onClick={() => { setDeleteConfirm(team.id); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 size={12} /> ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team name & description */}
                  <h3 className="font-bold text-sm sm:text-base mb-0.5" style={{ color: "var(--text)" }}>
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--text-muted)" }}>
                      {team.description}
                    </p>
                  )}
                  {!team.description && <div className="mb-3" />}

                  {/* Agent avatars row */}
                  <div className="flex items-center mb-4 mt-auto">
                    {teamAgents.length === 0 ? (
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>ยังไม่มีสมาชิก</span>
                    ) : (
                      <>
                        <div className="flex -space-x-2">
                          {teamAgents.slice(0, 5).map((a) => (
                            <div
                              key={a.id}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-sm"
                              style={{ borderColor: "var(--surface)", background: "var(--card)" }}
                              title={a.name}
                            >
                              {a.emoji}
                            </div>
                          ))}
                          {teamAgents.length > 5 && (
                            <div
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                              style={{ borderColor: "var(--surface)", background: "var(--border)", color: "var(--text-muted)" }}
                            >
                              +{teamAgents.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="ml-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {teamAgents.length} คน
                        </span>
                      </>
                    )}
                  </div>

                  {/* Research CTA button */}
                  <Link
                    href={`/research?teamId=${team.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: "var(--accent-12)", color: "var(--accent)" }}
                  >
                    <Sparkles size={14} />
                    เริ่มประชุม
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}

            {/* Create new team card */}
            <button
              onClick={openCreate}
              className="rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all hover:border-[var(--accent-40)] hover:bg-[var(--accent-4)] active:scale-[0.98] cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-10)" }}
              >
                <Plus size={24} style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                สร้างทีมใหม่
              </span>
            </button>
          </div>
        )}

      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={closeModal} />

          <div
            className="relative w-full sm:max-w-md border rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh] animate-in"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                  {editTarget ? "แก้ไขทีม" : "สร้างทีมใหม่"}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {editTarget ? "แก้ไขข้อมูลทีมที่ปรึกษา" : "รวมกลุ่ม AI agents เข้าด้วยกัน"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--accent-10)]"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-5 p-5 overflow-y-auto">
              {error && (
                <div className="border border-red-500/40 bg-red-500/10 rounded-xl px-3 py-2 text-sm text-red-400 animate-in">{error}</div>
              )}

              {/* Emoji + Name */}
              <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>ไอคอน</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    title="Team emoji"
                    placeholder="👥"
                    className="w-12 h-10 border rounded-xl text-center text-lg bg-transparent focus:outline-none transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                    maxLength={4}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>ชื่อทีม <span style={{ color: "var(--accent)" }}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น ทีมตรวจสอบภาษี"
                    className="h-10 border rounded-xl px-3 bg-transparent text-sm focus:outline-none transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>คำอธิบาย</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="อธิบายวัตถุประสงค์ของทีมนี้…"
                  className="h-10 border rounded-xl px-3 bg-transparent text-sm focus:outline-none transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </div>

              {/* Agent selection */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>สมาชิกในทีม</label>
                  <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{form.agentIds.length} เลือก</span>
                </div>
                {agents.length === 0 ? (
                  <div className="rounded-xl border p-4 text-center" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      ไม่มี active agent —{" "}
                      <Link href="/agents" className="underline" style={{ color: "var(--accent)" }}>เพิ่ม Agent</Link>
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                    {agents.map((agent) => {
                      const selected = form.agentIds.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => toggleAgent(agent.id)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all"
                          style={{
                            background: selected ? "var(--accent-12)" : "var(--surface)",
                            border: selected ? "1px solid var(--accent-40)" : "1px solid var(--border)",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: selected ? "var(--accent-20)" : "var(--card)" }}
                          >
                            {agent.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs truncate" style={{ color: selected ? "var(--accent)" : "var(--text)" }}>
                              {agent.name}
                            </div>
                            <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                              {agent.role}
                            </div>
                          </div>
                          <div
                            className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{
                              borderColor: selected ? "var(--accent)" : "var(--border)",
                              background: selected ? "var(--accent)" : "transparent",
                              color: selected ? "#000" : "transparent",
                            }}
                          >
                            {selected && <span className="text-xs font-bold">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl border disabled:opacity-40 transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl font-bold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {saving ? "กำลังบันทึก…" : editTarget ? "บันทึก" : "สร้างทีม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
