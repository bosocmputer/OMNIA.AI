export interface AstroCalculationInput {
  birthDate?: string;
  birthTime?: string;
  now?: Date;
}

export interface NumberMeaning {
  number: number;
  name: string;
  strength: string;
  risk: string;
  practicalUse: string;
}

export interface TaksaBase {
  base: string;
  planetNumber: number;
  planetName: string;
  meaning: string;
}

export interface TaksaCalculation {
  formulaVersion: string;
  birthPlanetNumber: number;
  birthPlanetName: string;
  weekdayForTaksa: string;
  isWednesdayNight: boolean;
  natalBases: TaksaBase[];
  ageInThaiReading: number | null;
  currentAgeBase: TaksaBase | null;
  caveat: string;
}

export interface SevenNumberCalculation {
  formulaVersion: string;
  sourceDigits: string;
  sevenDigits: number[];
  reducedNumber: number;
  repeatedDigits: { digit: number; count: number; meaning: string }[];
  missingDigits: { digit: number; meaning: string }[];
  zeroCount: number;
  caveat: string;
}

export interface AstroCalculationResult {
  lifePath: NumberMeaning | null;
  birthDay: NumberMeaning | null;
  personalYear: NumberMeaning | null;
  taksa: TaksaCalculation | null;
  sevenNumber: SevenNumberCalculation | null;
  json: {
    numerology: {
      lifePath: NumberMeaning | null;
      birthDay: NumberMeaning | null;
      personalYear: NumberMeaning | null;
    };
    taksa: TaksaCalculation | null;
    sevenNumber: SevenNumberCalculation | null;
  };
  summaryText: string;
}

const WEEKDAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TAKSA_PLANET_ORDER = [
  { planetNumber: 1, planetName: "อาทิตย์" },
  { planetNumber: 2, planetName: "จันทร์" },
  { planetNumber: 3, planetName: "อังคาร" },
  { planetNumber: 4, planetName: "พุธ" },
  { planetNumber: 7, planetName: "เสาร์" },
  { planetNumber: 5, planetName: "พฤหัสบดี" },
  { planetNumber: 8, planetName: "ราหู" },
  { planetNumber: 6, planetName: "ศุกร์" },
];

const TAKSA_BASES = [
  { base: "บริวาร", meaning: "คนรอบตัว ทีม ลูกน้อง เพื่อนร่วมทาง และแรงสนับสนุนใกล้ตัว" },
  { base: "อายุ", meaning: "สุขภาพ พลังใจ ความต่อเนื่อง และความอึดของเจ้าชะตา" },
  { base: "เดช", meaning: "อำนาจ ความกล้า การแข่งขัน การตัดสินใจ และแรงปะทะ" },
  { base: "ศรี", meaning: "โชค ความน่าเอ็นดู เสน่ห์ เงินที่ไหลง่าย และความช่วยเหลือ" },
  { base: "มูละ", meaning: "ฐานทรัพย์ บ้าน ครอบครัว เงินก้อน และสิ่งที่เป็นรากชีวิต" },
  { base: "อุตสาหะ", meaning: "งานหนัก ความพยายาม ภาระ การแก้ปัญหา และงานที่ต้องลงแรง" },
  { base: "มนตรี", meaning: "ผู้ใหญ่ ครู เจ้านาย ที่ปรึกษา และคนที่ช่วยเปิดทาง" },
  { base: "กาลกิณี", meaning: "จุดเสีย เรื่องติดขัด คนหรือสถานการณ์ที่ควรระวัง" },
];

const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    number: 1,
    name: "ผู้นำ/เริ่มก่อน",
    strength: "ตัดสินใจไว กล้าเปิดทาง เหมาะกับการเป็นคนกำหนดทิศ",
    risk: "ใจร้อน ยึดวิธีของตัวเอง หรือชนกับผู้มีอำนาจง่าย",
    practicalUse: "ให้เปิดประเด็นให้ชัดก่อน แล้วค่อยชวนคนอื่นตาม",
  },
  2: {
    number: 2,
    name: "ความสัมพันธ์/การประคอง",
    strength: "อ่านอารมณ์คนเก่ง เจรจานุ่มนวล เหมาะกับงานที่ต้องดูใจคน",
    risk: "ลังเล เกรงใจ หรือรับอารมณ์คนอื่นมากเกินไป",
    practicalUse: "ให้ถามความต้องการจริงของอีกฝ่ายก่อนตัดสินใจ",
  },
  3: {
    number: 3,
    name: "การลงมือ/แรงปะทะ",
    strength: "มีแรงลุย แก้ปัญหาเฉพาะหน้าได้ดี เหมาะกับการแข่งขัน",
    risk: "รีบเกินไป หงุดหงิดง่าย หรือพูดแรงโดยไม่ตั้งใจ",
    practicalUse: "ให้ใช้พลังกับงานที่ต้องจบเร็ว แต่ต้องมี checklist กันพลาด",
  },
  4: {
    number: 4,
    name: "การสื่อสาร/ข้อมูล",
    strength: "อธิบาย ประสานงาน เรียนรู้ และต่อรองได้ดี",
    risk: "ข้อมูลเยอะจนกระจาย พูดอ้อม หรือจับประเด็นหลักช้า",
    practicalUse: "ให้สรุปเป็น 3 ประเด็นหลักก่อนคุยหรือส่งงาน",
  },
  5: {
    number: 5,
    name: "ความรู้/ผู้ใหญ่",
    strength: "คิดเป็นระบบ มีหลักการ ได้แรงหนุนจากครู ผู้ใหญ่ หรือความเชี่ยวชาญ",
    risk: "คิดนาน ติดกรอบ หรือรอความมั่นใจจนเสียจังหวะ",
    practicalUse: "ให้ใช้ข้อมูลหรือผู้เชี่ยวชาญช่วยยืนยันก่อนตัดสินใจใหญ่",
  },
  6: {
    number: 6,
    name: "เงิน/เสน่ห์/ความพึงพอใจ",
    strength: "ขายภาพรวมได้ดี เข้าใจความต้องการคน เหมาะกับเงิน งานบริการ และความรัก",
    risk: "ใช้จ่ายตามใจ หวังผลที่ดูดีเกินจริง หรือใจอ่อนง่าย",
    practicalUse: "ให้ล็อกตัวเลข ราคา เงื่อนไข และสิ่งตอบแทนให้ชัด",
  },
  7: {
    number: 7,
    name: "วินัย/แรงกดดัน",
    strength: "อดทน ทำงานยากได้ รับผิดชอบเรื่องระยะยาว",
    risk: "แบกเกินจำเป็น เครียดสะสม หรือช้าเพราะกลัวพลาด",
    practicalUse: "ให้แตกงานใหญ่เป็นขั้นสั้น ๆ และกันเวลาพัก/สำรอง",
  },
  8: {
    number: 8,
    name: "อำนาจแฝง/ความเสี่ยง",
    strength: "มองเกมซับซ้อน ต่อรองเรื่องใหญ่ และจัดการเรื่องที่มีเดิมพันได้",
    risk: "เจอเงื่อนไขซ่อน คนพูดไม่หมด หรือความเสี่ยงเรื่องเงิน/อำนาจ",
    practicalUse: "ให้ถามเงื่อนไขลึก ๆ และทำทุกอย่างเป็นลายลักษณ์อักษร",
  },
  9: {
    number: 9,
    name: "สัญชาตญาณ/เทคโนโลยี/ภาพใหญ่",
    strength: "จับภาพรวมไว มีเซนส์ เหมาะกับงานใหม่ เทคโนโลยี และงานที่ต้องเห็นอนาคต",
    risk: "เชื่อความรู้สึกมากกว่าหลักฐาน หรือกระโดดข้ามรายละเอียด",
    practicalUse: "ให้ใช้ intuition เปิดทาง แต่ต้องตรวจด้วยข้อมูลจริง",
  },
};

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
  let value = Math.abs(n);
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

function getBirthPlanet(date: Date, birthTime?: string) {
  const weekday = date.getUTCDay();
  const time = birthTime?.trim() ?? "";
  const isWednesdayNight = weekday === 3 && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && Number(time.slice(0, 2)) >= 18;
  if (isWednesdayNight) return { planetNumber: 8, planetName: "ราหู", weekdayForTaksa: "พุธกลางคืน", isWednesdayNight };
  const planetByWeekday: Record<number, { planetNumber: number; planetName: string }> = {
    0: { planetNumber: 1, planetName: "อาทิตย์" },
    1: { planetNumber: 2, planetName: "จันทร์" },
    2: { planetNumber: 3, planetName: "อังคาร" },
    3: { planetNumber: 4, planetName: "พุธ" },
    4: { planetNumber: 5, planetName: "พฤหัสบดี" },
    5: { planetNumber: 6, planetName: "ศุกร์" },
    6: { planetNumber: 7, planetName: "เสาร์" },
  };
  return {
    ...planetByWeekday[weekday],
    weekdayForTaksa: WEEKDAYS_TH[weekday],
    isWednesdayNight,
  };
}

function buildTaksa(date: Date, birthTime: string | undefined, now: Date): TaksaCalculation {
  const birthPlanet = getBirthPlanet(date, birthTime);
  const startIndex = TAKSA_PLANET_ORDER.findIndex((p) => p.planetNumber === birthPlanet.planetNumber);
  const natalBases = TAKSA_BASES.map((baseInfo, index) => {
    const planet = TAKSA_PLANET_ORDER[(startIndex + index) % TAKSA_PLANET_ORDER.length];
    return {
      base: baseInfo.base,
      planetNumber: planet.planetNumber,
      planetName: planet.planetName,
      meaning: baseInfo.meaning,
    };
  });

  const { nextBirthdayAge } = getAge(date, now);
  const currentAgeBase = natalBases[(Math.max(nextBirthdayAge, 1) - 1) % natalBases.length] ?? null;

  return {
    formulaVersion: "OMNIA-TAKSA-ROTATION-v1",
    birthPlanetNumber: birthPlanet.planetNumber,
    birthPlanetName: birthPlanet.planetName,
    weekdayForTaksa: birthPlanet.weekdayForTaksa,
    isWednesdayNight: birthPlanet.isWednesdayNight,
    natalBases,
    ageInThaiReading: nextBirthdayAge,
    currentAgeBase,
    caveat: "ใช้ผังทักษา 8 ภูมิแบบหมุนจากดาววันเกิด และใช้อายุย่างเพื่ออ่านภูมิอายุจร; สำนักต่าง ๆ อาจมีรายละเอียดปลีกย่อยต่างกัน",
  };
}

function buildSevenNumber(date: Date): SevenNumberCalculation {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const buddhistYear = String(date.getUTCFullYear() + 543);
  const sourceDigits = `${day}${month}${buddhistYear.slice(-2)}`;
  const reducedNumber = reduceToOneDigit(sumDigits(sourceDigits));
  const sevenDigits = [...sourceDigits, String(reducedNumber)].map((d) => Number(d));
  const counts = new Map<number, number>();
  for (const digit of sevenDigits) counts.set(digit, (counts.get(digit) ?? 0) + 1);

  const repeatedDigits = [...counts.entries()]
    .filter(([digit, count]) => digit !== 0 && count >= 2)
    .map(([digit, count]) => ({
      digit,
      count,
      meaning: NUMBER_MEANINGS[digit]?.strength ?? "พลังเลขนี้เด่นซ้ำในผัง",
    }));
  const missingDigits = Array.from({ length: 9 }, (_, i) => i + 1)
    .filter((digit) => !counts.has(digit))
    .map((digit) => ({
      digit,
      meaning: NUMBER_MEANINGS[digit]?.risk ?? "เป็นจุดที่ควรเสริม",
    }));

  return {
    formulaVersion: "OMNIA-SEVEN-NUMBER-BASIC-v1",
    sourceDigits,
    sevenDigits,
    reducedNumber,
    repeatedDigits,
    missingDigits,
    zeroCount: counts.get(0) ?? 0,
    caveat: "เป็นเลข 7 ตัวแบบพื้นฐานจาก วัน 2 หลัก + เดือน 2 หลัก + ปี พ.ศ. 2 หลักท้าย + เลขรวมลดรูป; ยังไม่แทนผัง 9 ฐานเชิงลึกของทุกสำนัก",
  };
}

function formatMeaning(label: string, meaning: NumberMeaning | null): string | null {
  if (!meaning) return null;
  return `${label}: เลข ${meaning.number} (${meaning.name}) — จุดเด่น: ${meaning.strength}; จุดระวัง: ${meaning.risk}; วิธีใช้: ${meaning.practicalUse}`;
}

export function buildAstroCalculations(input: AstroCalculationInput): AstroCalculationResult | null {
  const date = parseDate(input.birthDate);
  if (!date) return null;
  const now = input.now ?? new Date();
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const lifePathNumber = reduceToOneDigit(sumDigits(input.birthDate ?? ""));
  const birthDayNumber = reduceToOneDigit(day);
  const personalYearNumber = reduceToOneDigit(day + month + sumDigits(String(now.getUTCFullYear())));

  const lifePath = NUMBER_MEANINGS[lifePathNumber] ?? null;
  const birthDay = NUMBER_MEANINGS[birthDayNumber] ?? null;
  const personalYear = NUMBER_MEANINGS[personalYearNumber] ?? null;
  const taksa = buildTaksa(date, input.birthTime, now);
  const sevenNumber = buildSevenNumber(date);

  const summaryLines = [
    formatMeaning("เลขเส้นชีวิต", lifePath),
    formatMeaning("เลขวันเกิด", birthDay),
    formatMeaning(`เลขปีส่วนตัว ${now.getUTCFullYear()}`, personalYear),
    taksa.currentAgeBase
      ? `ทักษา: เกิดวัน${taksa.weekdayForTaksa} ดาวประจำวันเกิดคือ ${taksa.birthPlanetName} (${taksa.birthPlanetNumber}); อายุย่าง ${taksa.ageInThaiReading} ตกภูมิ ${taksa.currentAgeBase.base} (${taksa.currentAgeBase.planetName}) — ${taksa.currentAgeBase.meaning}`
      : null,
    `เลข 7 ตัวพื้นฐาน: ${sevenNumber.sevenDigits.join(" ")} (จาก ${sevenNumber.sourceDigits} + เลขรวม ${sevenNumber.reducedNumber}); เลขซ้ำ: ${sevenNumber.repeatedDigits.length ? sevenNumber.repeatedDigits.map((d) => `${d.digit}x${d.count}`).join(", ") : "ไม่มี"}; เลขที่ขาด: ${sevenNumber.missingDigits.slice(0, 5).map((d) => d.digit).join(", ") || "ไม่มี"}`,
    `ข้อจำกัดเลข 7 ตัว: ${sevenNumber.caveat}`,
  ].filter(Boolean) as string[];

  return {
    lifePath,
    birthDay,
    personalYear,
    taksa,
    sevenNumber,
    json: {
      numerology: { lifePath, birthDay, personalYear },
      taksa,
      sevenNumber,
    },
    summaryText: summaryLines.join("\n"),
  };
}

