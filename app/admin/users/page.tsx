"use client";
import { useEffect, useState } from "react";
import { Trash2, KeyRound, UserPlus, Shield, User } from "lucide-react";

interface UserRow {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Reset password
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    } else {
      setError("โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewUsername(""); setNewPassword(""); setNewRole("user");
      await fetchUsers();
    } else {
      setCreateError(data.error || "เกิดข้อผิดพลาด");
    }
    setCreating(false);
  }

  async function handleResetPassword(id: string) {
    if (!resetPassword || resetPassword.length < 6) return;
    setResetting(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) { setResetId(null); setResetPassword(""); }
    setResetting(false);
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`ลบผู้ใช้ "${username}" ใช่ไหม?\n\nข้อมูลการประชุมของผู้ใช้จะยังถูกเก็บไว้ แต่ผู้ใช้จะเข้าระบบไม่ได้อีก`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await fetchUsers();
  }

  async function handleToggleRole(user: UserRow) {
    const newRole = user.role === "admin" ? "user" : "admin";
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await fetchUsers();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>จัดการผู้ใช้</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>เพิ่ม ลบ หรือเปลี่ยนรหัสผ่านผู้ใช้ในระบบ</p>
      </div>

      {/* Add user form */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>เพิ่มผู้ใช้ใหม่</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ชื่อผู้ใช้"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required minLength={3} maxLength={50}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <input
              type="password"
              placeholder="รหัสผ่าน (≥6 ตัว)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required minLength={6}
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <option value="user">ผู้ใช้ทั่วไป</option>
              <option value="admin">ผู้จัดการระบบ</option>
            </select>
          </div>
          {createError && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{createError}</p>}
          <button
            type="submit" disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <UserPlus size={14} />
            {creating ? "กำลังสร้าง…" : "สร้างผู้ใช้"}
          </button>
        </form>
      </div>

      {/* User list */}
      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-5 py-3 border-b text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          ผู้ใช้ทั้งหมด ({users.length})
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>กำลังโหลด…</div>
        ) : error ? (
          <div className="p-6 text-center text-sm" style={{ color: "#f87171" }}>{error}</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {users.map((u) => (
              <li key={u.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {u.role === "admin" ? <Shield size={14} style={{ color: "var(--accent)" }} /> : <User size={14} style={{ color: "var(--text-muted)" }} />}
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{u.username}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
                      background: u.role === "admin" ? "var(--accent-8)" : "var(--surface)",
                      color: u.role === "admin" ? "var(--accent)" : "var(--text-muted)",
                    }}>
                      {u.role === "admin" ? "ผู้จัดการระบบ" : "ผู้ใช้ทั่วไป"}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString("th")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleRole(u)}
                      title={u.role === "admin" ? "เปลี่ยนเป็น user" : "เปลี่ยนเป็น admin"}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Shield size={14} />
                    </button>
                    <button
                      onClick={() => { setResetId(u.id); setResetPassword(""); }}
                      title="เปลี่ยนรหัสผ่าน"
                      className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <KeyRound size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      title="ลบผู้ใช้"
                      className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      style={{ color: "#f87171" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Reset password inline */}
                {resetId === u.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="password"
                      placeholder="รหัสผ่านใหม่ (≥6 ตัว)"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      disabled={resetting || resetPassword.length < 6}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      {resetting ? "…" : "บันทึก"}
                    </button>
                    <button
                      onClick={() => setResetId(null)}
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
