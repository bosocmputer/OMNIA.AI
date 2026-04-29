# OMNIA.AI — Current Status

อัปเดตล่าสุด: 29 เมษายน 2569

## สถานะโดยรวม

พร้อมสำหรับ demo / soft launch กลุ่มทดลองแรก โดยปิดการหักเครดิตชั่วคราวให้ user ทดลองฟรี

## URL ใช้งาน

- Local/LAN: `http://192.168.2.109:3005`
- Demo quick tunnel: `https://tires-soon-join-stop.trycloudflare.com`

หมายเหตุ: quick tunnel เป็น Cloudflare free/account-less URL จะเปลี่ยนถ้า tunnel restart หรือ server reboot และไม่ควรถือเป็น production URL ถาวร

## สิ่งที่พร้อมแล้ว

- ระบบ login/register พร้อม PDPA consent
- หน้า privacy, terms, contact พร้อมใช้งาน
- ห้องดูดวง `/research` พร้อมเลือกเจ้าชะตาและหมอดูหลายศาสตร์
- Prompt ของหมอดูปรับให้ตอบตรงขึ้น ทักจุดดี/จุดเสี่ยง ไม่ดีต้องบอกไม่ดี
- Credit wallet / PromptPay manual top-up ยังอยู่ในระบบ แต่ถูกพักจาก flow ลูกค้าระหว่าง demo
- Admin approval ที่ `/admin/topups` ยังอยู่สำหรับเปิดใช้จริงภายหลัง
- ระหว่าง demo ทุก user เห็น `Demo mode · ถามฟรี`
- ทุก user ไม่ถูกหักเครดิตเมื่อถามระหว่าง demo
- Admin/superadmin ยังคงถูกยกเว้นการหักเครดิตจริงที่ server-side
- Analytics dashboard และ feedback dashboard พร้อมดูภาพรวม
- Theme dark green/gold ปรับเข้าชุดทั้ง app

## ข้อมูล PromptPay

- ชื่อบัญชี: นนทวัช  วงค์หนัก
- PromptPay ID: `0904681299`
- QR asset: `public/assets/payments/promptpay-qr.jpg`

## Flow ที่ควรให้ลูกค้าทดลอง

1. สมัครสมาชิกใหม่
2. ถามเร็ว/ถามแบบสภา OMNIA ได้เลยโดยไม่ต้องเติมเครดิต
3. ตรวจว่า sidebar แสดง Demo mode / ถามฟรี
4. ให้ feedback ว่าแม่น/อ่านง่าย/กว้างไป/ยาวไป
5. เก็บความเห็นเรื่องราคาที่ลูกค้ายอมรับได้

## ข้อควรจำสำหรับ demo

- Quick tunnel URL ปัจจุบันชี้ไปที่ port `3005` เท่านั้น
- มี Cloudflare tunnel อื่นบน server อยู่แล้ว ห้าม kill รวมทั้งหมด
- Process quick tunnel ล่าสุดใช้คำสั่ง `cloudflared tunnel --url http://localhost:3005 --no-autoupdate`
- ถ้า URL เดิมเข้าไม่ได้ ให้เปิด quick tunnel ใหม่เฉพาะ port `3005`
- Credit billing ปิดอยู่โดย default; เปิดขายจริงด้วย env `CREDIT_BILLING_ENABLED=true`

## สิ่งที่ควรทำหลังได้ feedback จริง

- ปรับ prompt ตาม feedback เรื่องความแม่น/ความแรง/ความยาว
- หลัง demo ค่อยเปิด conversion จากทดลองใช้ฟรี → เติมเครดิต
- พิจารณา Cloudflare named tunnel + custom domain ถ้าจะเปิดใช้จริง
- พิจารณา slip upload/OCR หรือ webhook payment ภายหลัง ถ้า manual approval เริ่มช้า
