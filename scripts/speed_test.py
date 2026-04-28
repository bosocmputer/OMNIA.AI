#!/usr/bin/env python3
import json, os, time, http.client

host = os.environ.get("OMNIA_HOST", "192.168.2.109")
port = int(os.environ.get("OMNIA_PORT", "3005"))
body = json.dumps({
    "question": "บริษัทจำกัดที่จดทะเบียน VAT แล้ว มีรายได้ 10 ล้านบาทต่อปี ขายสินค้าทั่วไป ต้องเสียภาษีมูลค่าเพิ่มอัตราเท่าไหร่ และมีข้อยกเว้นอะไรบ้าง",
    "agentIds": [
        "088bf3ff-38c0-4c02-bbaf-272508edccf4",
        "7169c8d1-722e-4cc5-9b6d-92e3da7af7cf",
        "47d35cae-547a-45ce-95bb-92206d934a70",
        "12074e84-f69c-44ef-ad9c-d7b7246eea3b",
        "2d37cc1f-dc90-4dc5-ab4a-8218b9ef5091",
    ],
    "mode": "meeting",
    "teamId": "default",
    "priorContext": "",
    "useWebSearch": False,
    "useMcp": False,
    "fileContext": "",
})

conn = http.client.HTTPConnection(host, port, timeout=300)
conn.request("POST", "/api/team-research/stream", body, {"Content-Type": "application/json"})
resp = conn.getresponse()

t0 = time.time()
findings = []
chats = []
buf = ""

import sys
print("Connected, waiting for stream...", flush=True)

current_event = ""
while True:
    chunk = resp.read(1)
    if not chunk:
        break
    buf += chunk.decode("utf-8", errors="replace")
    while "\n" in buf:
        line, buf = buf.split("\n", 1)
        line = line.strip()
        if not line:
            current_event = ""
            continue
        if line.startswith("event:"):
            current_event = line[6:].strip()
            continue
        if line.startswith("data:"):
            line = line[5:].strip()
        try:
            d = json.loads(line)
        except:
            continue
        t = time.time() - t0
        name = d.get("name", d.get("agentName", ""))
        role = d.get("role", "")
        if current_event == "agent_start":
            print(f"[{t:6.1f}s] ▶ START: {name}", flush=True)
        elif current_event == "message":
            if role == "thinking":
                print(f"[{t:6.1f}s] 💭 THINKING: {name}", flush=True)
            elif role == "finding":
                findings.append(t)
                print(f"[{t:6.1f}s] ✅ FINDING: {name}", flush=True)
            elif role == "chat":
                chats.append(t)
                print(f"[{t:6.1f}s] 💬 CHAT: {name}", flush=True)
            elif role == "synthesis":
                print(f"[{t:6.1f}s] 🏛️ SYNTHESIS", flush=True)
        elif current_event == "done":
            total = time.time() - t0
            print(f"[{total:6.1f}s] 🎉 DONE!", flush=True)
            print(f"\n=== SUMMARY ===")
            print(f"Phase 1 (findings): {findings[0]:.1f}s - {findings[-1]:.1f}s" if findings else "No findings")
            print(f"Phase 2 (chats): {chats[0]:.1f}s - {chats[-1]:.1f}s" if chats else "No chats")
            print(f"TOTAL: {total:.1f}s ({total/60:.1f} min)")
            sys.exit(0)

print(f"Stream ended after {time.time()-t0:.1f}s")
