# OMNIA.AI — Current Status

อัปเดตล่าสุด: 29 เมษายน 2569

## สถานะโดยรวม

พร้อมสำหรับ demo / soft launch กลุ่มทดลองแรก

## URL ใช้งาน

- Local/LAN: `http://192.168.2.109:3005`
- Demo quick tunnel: `https://tires-soon-join-stop.trycloudflare.com`

หมายเหตุ: quick tunnel เป็น Cloudflare free/account-less URL จะเปลี่ยนถ้า tunnel restart หรือ server reboot และไม่ควรถือเป็น production URL ถาวร

## สิ่งที่พร้อมแล้ว

- ระบบ login/register พร้อม PDPA consent
- หน้า privacy, terms, contact พร้อมใช้งาน
- ห้องดูดวง `/research` พร้อมเลือกเจ้าชะตาและหมอดูหลายศาสตร์
- Prompt ของหมอดูปรับให้ตอบตรงขึ้น ทักจุดดี/จุดเสี่ยง ไม่ดีต้องบอกไม่ดี
- Credit wallet พร้อมแพ็ก Starter/Focus/Pro
- PromptPay manual top-up พร้อม QR และรายการแจ้งโอน
- Admin approval ที่ `/admin/topups`
- Credit balance แสดงใน sidebar และหน้า `/research`
- Admin/superadmin แสดง `Admin mode · ไม่หักเครดิต`
- Admin/superadmin ถูกยกเว้นการหักเครดิตจริงที่ server-side
- Analytics dashboard และ feedback dashboard พร้อมดูภาพรวม
- Theme dark green/gold ปรับเข้าชุดทั้ง app

## ข้อมูล PromptPay

- ชื่อบัญชี: นนทวัช  วงค์หนัก
- PromptPay ID: `0904681299`
- QR asset: `public/assets/payments/promptpay-qr.jpg`

## Flow ที่ควรให้ลูกค้าทดลอง

1. สมัครสมาชิกใหม่
2. ตรวจว่าได้เครดิตฟรี 29 เครดิต
3. ถามเร็ว 1 ครั้ง
4. ตรวจว่าเครดิตคงเหลือแสดงที่ sidebar
5. ลองถามต่อเมื่อเครดิตไม่พอและดูว่า app พาไปเติมเครดิต
6. เลือกแพ็ก เติมผ่าน PromptPay และส่งหมายเหตุโอน
7. ให้ superadmin อนุมัติที่ `/admin/topups`
8. ลูกค้ากลับไปถามต่อ
9. ให้ feedback ว่าแม่น/อ่านง่าย/กว้างไป/ยาวไป

## ข้อควรจำสำหรับ demo

- Quick tunnel URL ปัจจุบันชี้ไปที่ port `3005` เท่านั้น
- มี Cloudflare tunnel อื่นบน server อยู่แล้ว ห้าม kill รวมทั้งหมด
- Process quick tunnel ล่าสุดใช้คำสั่ง `cloudflared tunnel --url http://localhost:3005 --no-autoupdate`
- ถ้า URL เดิมเข้าไม่ได้ ให้เปิด quick tunnel ใหม่เฉพาะ port `3005`

## สิ่งที่ควรทำหลังได้ feedback จริง

- ปรับ prompt ตาม feedback เรื่องความแม่น/ความแรง/ความยาว
- เก็บ conversion จากเครดิตฟรี → เติมเครดิต
- พิจารณา Cloudflare named tunnel + custom domain ถ้าจะเปิดใช้จริง
- พิจารณา slip upload/OCR หรือ webhook payment ภายหลัง ถ้า manual approval เริ่มช้า
