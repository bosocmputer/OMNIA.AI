/**
 * คำอธิบายศัพท์ AI/บัญชี สำหรับ Tooltip และ Glossary page
 * ภาษาหลัก: ไทย (target user = พนักงานบัญชี/สำนักงานบัญชี)
 */

export interface GlossaryEntry {
  term: string;
  short: string;
  long?: string;
  example?: string;
  category: "ai" | "accounting" | "cost" | "ui";
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  prompt: {
    term: "Prompt (คำสั่ง)",
    short: "ข้อความที่ส่งให้ AI เพื่อสั่งงาน",
    long: "คำสั่งหรือคำถามที่เราพิมพ์ส่งให้ AI เพื่อให้ตอบกลับ คล้ายการพิมพ์คำถามใน Google แต่เป็นการคุยกับ AI",
    example: "วิเคราะห์งบการเงินไตรมาส 1 ปี 2568",
    category: "ai",
  },
  systemPrompt: {
    term: "บทบาท (System Prompt)",
    short: "ข้อความที่กำหนด 'ตัวตน' ให้กับที่ปรึกษา AI",
    long: "กำหนดว่าที่ปรึกษานี้มีความเชี่ยวชาญอะไร พูดจาแบบไหน ยึดหลักการอะไร เช่น ที่ปรึกษาภาษีต้องอ้างประมวลรัษฎากร",
    example: "คุณคือที่ปรึกษาภาษีที่ปฏิบัติตามประมวลรัษฎากร ตอบตรงประเด็น อ้างอิงมาตราเสมอ",
    category: "ai",
  },
  tokens: {
    term: "Token (หน่วยการใช้งาน)",
    short: "หน่วยนับของ AI คล้าย ๆ 'คำ' แต่แยกย่อยกว่า",
    long: "1 token ≈ 0.75 คำภาษาอังกฤษ หรือ 1-2 ตัวอักษรไทย ยิ่งคำยาว ยิ่งใช้ token เยอะ ค่าบริการ AI คิดตามจำนวน token ที่ใช้",
    example: "คำถาม 100 คำไทย ≈ 150-200 tokens",
    category: "cost",
  },
  inputTokens: {
    term: "Input Tokens (พิมพ์)",
    short: "จำนวน token ที่เราพิมพ์ส่งให้ AI",
    long: "รวมทั้งคำถาม ไฟล์ที่แนบ และประวัติการสนทนาที่ส่งไปให้ AI อ่านเพื่อตอบ",
    category: "cost",
  },
  outputTokens: {
    term: "Output Tokens (ตอบ)",
    short: "จำนวน token ที่ AI ตอบกลับมา",
    long: "คำตอบจาก AI คิดราคาแพงกว่า input tokens ประมาณ 3-5 เท่า (ขึ้นกับ model)",
    category: "cost",
  },
  contextWindow: {
    term: "Context Window (หน่วยความจำ AI)",
    short: "ขนาดข้อมูลสูงสุดที่ AI จำได้ในการสนทนาเดียว",
    long: "ยิ่ง context window ใหญ่ AI ยิ่งจำข้อมูลยาวได้ เช่น 128K tokens = อ่านหนังสือ 300 หน้าได้ครั้งเดียว ถ้าเกินจะลืมข้อความแรก ๆ",
    category: "ai",
  },
  streaming: {
    term: "Streaming (พิมพ์ทีละตัว)",
    short: "AI ทยอยส่งคำตอบทีละคำ แทนที่จะรอครบแล้วค่อยส่ง",
    long: "ทำให้รู้สึกว่า AI ตอบเร็วขึ้น เห็นคำตอบไหลมาเรื่อย ๆ คล้ายพิมพ์สด",
    category: "ai",
  },
  rag: {
    term: "RAG (Retrieval-Augmented Generation)",
    short: "AI ค้นข้อมูลจากเอกสารของเราก่อนตอบ",
    long: "แทนที่จะตอบจากความรู้ที่ฝึกมา AI จะค้นเอกสารที่เราแนบไว้ (knowledge base) เพื่อตอบจากข้อมูลจริงของบริษัทเรา",
    category: "ai",
  },
  mcp: {
    term: "MCP (Model Context Protocol)",
    short: "วิธีให้ AI เชื่อมต่อกับระบบภายนอก เช่น database",
    long: "โปรโตคอลที่ทำให้ AI สามารถเรียก tool หรือดึงข้อมูลจากระบบที่เชื่อมไว้ เช่น โปรแกรมบัญชี หรือ ERP",
    category: "ai",
  },
  ttft: {
    term: "TTFT (Time To First Token)",
    short: "เวลาก่อนที่ AI จะตอบคำแรก",
    long: "วินาทีที่รอตั้งแต่กด enter จนเห็นคำแรกของคำตอบ ยิ่งน้อยยิ่งดี เช่น TTFT 0.5s = รอครึ่งวินาที",
    category: "ai",
  },
  tokensPerSec: {
    term: "Tokens/sec (ความเร็วคำตอบ)",
    short: "จำนวน token ที่ AI พิมพ์ได้ต่อวินาที",
    long: "ยิ่งเยอะยิ่งเร็ว เช่น 135 tok/s = ตอบประมาณ 100 คำไทยต่อวินาที",
    category: "ai",
  },
  temperature: {
    term: "Temperature (ความคิดสร้างสรรค์)",
    short: "ตั้งค่าให้ AI ตอบแม่นยำหรือสร้างสรรค์",
    long: "0 = ตอบแม่นยำซ้ำเดิม (เหมาะกับคำนวณภาษี) · 1 = สร้างสรรค์หลากหลาย (เหมาะกับ brainstorm) · ค่ามาตรฐาน 0.3-0.7",
    category: "ai",
  },
  tfrs: {
    term: "TFRS (Thai Financial Reporting Standards)",
    short: "มาตรฐานการรายงานทางการเงินของไทย (อิง IFRS)",
    long: "ใช้กับบริษัทที่จดทะเบียนในตลาดหลักทรัพย์ หรือมีส่วนได้เสียสาธารณะ (PAEs)",
    category: "accounting",
  },
  npaes: {
    term: "NPAEs",
    short: "มาตรฐานบัญชีสำหรับกิจการที่ไม่มีส่วนได้เสียสาธารณะ",
    long: "Non-Publicly Accountable Entities — ใช้กับ SME ที่ไม่ได้เข้าตลาดหลักทรัพย์ ง่ายกว่า TFRS สำหรับ PAEs",
    category: "accounting",
  },
  paes: {
    term: "PAEs",
    short: "กิจการที่มีส่วนได้เสียสาธารณะ",
    long: "Publicly Accountable Entities — บริษัทมหาชน หรือธนาคาร/ประกัน ต้องใช้ TFRS เต็มรูปแบบ",
    category: "accounting",
  },
  tsqc: {
    term: "TSQC (Thai Standard on Quality Control)",
    short: "มาตรฐานควบคุมคุณภาพงานสอบบัญชี",
    long: "บังคับใช้กับสำนักงานสอบบัญชีทุกแห่ง เพื่อให้มั่นใจคุณภาพงาน",
    category: "accounting",
  },
  coso: {
    term: "COSO Framework",
    short: "กรอบการควบคุมภายในที่เป็นสากล",
    long: "ใช้ประเมินความเสี่ยงและควบคุมภายในของกิจการ ครอบคลุม 5 องค์ประกอบ เช่น control environment, risk assessment",
    category: "accounting",
  },
  section40: {
    term: "มาตรา 40 ประมวลรัษฎากร",
    short: "ประเภทเงินได้พึงประเมิน 8 ประเภท",
    long: "แบ่งรายได้เป็น 8 ประเภท (ม.40(1)-(8)) เพื่อคำนวณภาษีเงินได้บุคคลธรรมดา เช่น ม.40(1)=เงินเดือน ม.40(8)=ธุรกิจอื่น ๆ",
    category: "accounting",
  },
  section65: {
    term: "มาตรา 65 ประมวลรัษฎากร",
    short: "หลักเกณฑ์คำนวณกำไรสุทธิทางภาษี",
    long: "กำหนดรายการที่หักเป็นรายจ่ายได้/ไม่ได้ในการคำนวณภาษีเงินได้นิติบุคคล",
    category: "accounting",
  },
  session: {
    term: "Session (การประชุม)",
    short: "บันทึกการสนทนาหนึ่งครั้งกับที่ปรึกษา AI",
    long: "แต่ละ session เริ่มจากคำถามเดียว และจบเมื่อได้คำตอบ สามารถกลับมาเปิดดูย้อนหลังได้",
    category: "ui",
  },
  agent: {
    term: "Agent (ที่ปรึกษา AI)",
    short: "AI ที่ถูกสอนให้เชี่ยวชาญด้านเฉพาะทาง",
    long: "เช่น ที่ปรึกษาภาษี ที่ปรึกษาบัญชี นักตรวจสอบภายใน ปรับแต่งบทบาทและความรู้ได้",
    category: "ai",
  },
  team: {
    term: "Team (ทีม)",
    short: "กลุ่มของที่ปรึกษา AI หลายคน",
    long: "จัดที่ปรึกษาเป็นทีมเพื่อประชุมร่วมกัน เช่น ทีมวิเคราะห์งบการเงินมี CPA + นักบัญชีอาวุโส + ที่ปรึกษาภาษี",
    category: "ui",
  },
};

/**
 * Helper: lookup glossary term. Returns short description, or undefined if not found.
 */
export function getGlossary(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key];
}

/**
 * Helper: list entries by category.
 */
export function listGlossary(category?: GlossaryEntry["category"]): GlossaryEntry[] {
  const all = Object.values(GLOSSARY);
  return category ? all.filter((e) => e.category === category) : all;
}
