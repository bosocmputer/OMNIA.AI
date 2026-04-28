export interface BirthFactInput {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
}

export interface BirthFacts {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  age: number | null;
  nextBirthdayAge: number | null;
  weekdayTh: string;
  buddhistYear: number | null;
  westernZodiac: string;
  chineseZodiac: string;
  lifePathNumber: number | null;
  birthDayNumber: number | null;
  personalYearNumber: number | null;
  timeKnown: boolean;
  timeNote: string;
  summaryText: string;
}

const WEEKDAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const CHINESE_ZODIAC_TH = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];

function parseDate(dateText?: string): Date | null {
  if (!dateText) return null;
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

function sumDigits(value: string): number {
  return value.replace(/\D/g, "").split("").reduce((sum, d) => sum + Number(d), 0);
}

function reduceToOneDigit(n: number): number {
  let value = n;
  while (value > 9) value = String(value).split("").reduce((sum, d) => sum + Number(d), 0);
  return value;
}

function getAge(date: Date, now: Date): { age: number; nextBirthdayAge: number } {
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const thisYearBirthday = Date.UTC(now.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (today < thisYearBirthday) age -= 1;
  return { age, nextBirthdayAge: age + 1 };
}

function getWesternZodiac(month: number, day: number): string {
  const signs = [
    { name: "มังกร", from: [1, 20] },
    { name: "กุมภ์", from: [2, 19] },
    { name: "มีน", from: [3, 21] },
    { name: "เมษ", from: [4, 20] },
    { name: "พฤษภ", from: [5, 21] },
    { name: "เมถุน", from: [6, 22] },
    { name: "กรกฎ", from: [7, 23] },
    { name: "สิงห์", from: [8, 23] },
    { name: "กันย์", from: [9, 23] },
    { name: "ตุล", from: [10, 24] },
    { name: "พิจิก", from: [11, 22] },
    { name: "ธนู", from: [12, 22] },
  ];
  let current = "มังกร";
  for (const sign of signs) {
    const [m, d] = sign.from;
    if (month > m || (month === m && day >= d)) current = sign.name;
  }
  return current;
}

function getChineseZodiac(year: number): string {
  return CHINESE_ZODIAC_TH[(year - 4) % 12];
}

export function buildBirthFacts(input: BirthFactInput, now = new Date()): BirthFacts | null {
  const date = parseDate(input.birthDate);
  if (!date) return null;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const ageInfo = getAge(date, now);
  const lifePathNumber = reduceToOneDigit(sumDigits(input.birthDate ?? ""));
  const birthDayNumber = reduceToOneDigit(day);
  const personalYearNumber = reduceToOneDigit(day + month + sumDigits(String(now.getUTCFullYear())));
  const timeKnown = !!input.birthTime && input.birthTime !== "ไม่ทราบ";
  const nearMidnight = !!input.birthTime && /^(00:|23:)/.test(input.birthTime);
  const timeNote = !timeKnown
    ? "ไม่ทราบเวลาเกิด จึงควรหลีกเลี่ยงการฟันธงเรื่องลัคนา/เรือนชะตา"
    : nearMidnight
      ? "เวลาเกิดใกล้เที่ยงคืน ต้องระวังคาบเกี่ยววันและการคำนวณลัคนา"
      : "มีเวลาเกิด ใช้ประกอบการอ่านจังหวะได้ละเอียดขึ้น แต่ห้ามอ้างองศาดาวถ้าไม่ได้คำนวณจริง";

  const facts: BirthFacts = {
    name: input.name?.trim() || "เจ้าชะตา",
    birthDate: input.birthDate ?? "",
    birthTime: input.birthTime || "ไม่ทราบ",
    birthPlace: input.birthPlace || "ไม่ระบุ",
    age: ageInfo.age,
    nextBirthdayAge: ageInfo.nextBirthdayAge,
    weekdayTh: WEEKDAYS_TH[date.getUTCDay()],
    buddhistYear: year + 543,
    westernZodiac: getWesternZodiac(month, day),
    chineseZodiac: getChineseZodiac(year),
    lifePathNumber,
    birthDayNumber,
    personalYearNumber,
    timeKnown,
    timeNote,
    summaryText: "",
  };

  facts.summaryText = [
    `ชื่อเจ้าชะตา: ${facts.name}`,
    `วันเกิด: ${facts.birthDate} (${facts.weekdayTh}), พ.ศ. ${facts.buddhistYear}`,
    `อายุปัจจุบันโดยประมาณ: ${facts.age} ปี, อายุย่าง/วันเกิดถัดไป: ${facts.nextBirthdayAge} ปี`,
    `เวลาเกิด: ${facts.birthTime} — ${facts.timeNote}`,
    `สถานที่เกิด: ${facts.birthPlace}`,
    `ราศีตะวันตกพื้นฐาน: ${facts.westernZodiac}, ปีนักษัตรพื้นฐาน: ${facts.chineseZodiac}`,
    `เลขวันเกิด: ${facts.birthDayNumber}, เลขเส้นชีวิต: ${facts.lifePathNumber}, เลขปีส่วนตัว ${now.getUTCFullYear()}: ${facts.personalYearNumber}`,
  ].join("\n");

  return facts;
}

