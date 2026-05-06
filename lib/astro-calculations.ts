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

export interface StemBranch {
  index: number;
  stem: string;
  stemEn: string;
  stemTh: string;
  stemElement: string;
  stemPolarity: "Yang" | "Yin";
  branch: string;
  branchEn: string;
  branchTh: string;
  branchElement: string;
  hiddenStems: string[];
  label: string;
}

export interface BaziCalculation {
  formulaVersion: string;
  year: StemBranch;
  month: StemBranch;
  day: StemBranch;
  hour: StemBranch | null;
  dayMaster: {
    stem: string;
    stemEn: string;
    stemTh: string;
    element: string;
    polarity: "Yang" | "Yin";
  };
  hourBranchNote: string;
  elementCounts: Record<string, number>;
  caveat: string;
}

export interface AstroCalculationResult {
  lifePath: NumberMeaning | null;
  birthDay: NumberMeaning | null;
  personalYear: NumberMeaning | null;
  taksa: TaksaCalculation | null;
  sevenNumber: SevenNumberCalculation | null;
  bazi: BaziCalculation | null;
  json: {
    numerology: {
      lifePath: NumberMeaning | null;
      birthDay: NumberMeaning | null;
      personalYear: NumberMeaning | null;
    };
    taksa: TaksaCalculation | null;
    sevenNumber: SevenNumberCalculation | null;
    bazi: BaziCalculation | null;
  };
  summaryText: string;
}

const WEEKDAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const STEMS = [
  { stem: "甲", en: "Jia", th: "เจี่ย", element: "ไม้", polarity: "Yang" as const },
  { stem: "乙", en: "Yi", th: "อี่", element: "ไม้", polarity: "Yin" as const },
  { stem: "丙", en: "Bing", th: "ปิ่ง", element: "ไฟ", polarity: "Yang" as const },
  { stem: "丁", en: "Ding", th: "ติง", element: "ไฟ", polarity: "Yin" as const },
  { stem: "戊", en: "Wu", th: "อู้", element: "ดิน", polarity: "Yang" as const },
  { stem: "己", en: "Ji", th: "จี๋", element: "ดิน", polarity: "Yin" as const },
  { stem: "庚", en: "Geng", th: "เกิง", element: "ทอง", polarity: "Yang" as const },
  { stem: "辛", en: "Xin", th: "ซิน", element: "ทอง", polarity: "Yin" as const },
  { stem: "壬", en: "Ren", th: "เหริน", element: "น้ำ", polarity: "Yang" as const },
  { stem: "癸", en: "Gui", th: "กุ่ย", element: "น้ำ", polarity: "Yin" as const },
];
const BRANCHES = [
  { branch: "子", en: "Zi", th: "ชวด", element: "น้ำ", hiddenStems: ["癸"] },
  { branch: "丑", en: "Chou", th: "ฉลู", element: "ดิน", hiddenStems: ["己", "癸", "辛"] },
  { branch: "寅", en: "Yin", th: "ขาล", element: "ไม้", hiddenStems: ["甲", "丙", "戊"] },
  { branch: "卯", en: "Mao", th: "เถาะ", element: "ไม้", hiddenStems: ["乙"] },
  { branch: "辰", en: "Chen", th: "มะโรง", element: "ดิน", hiddenStems: ["戊", "乙", "癸"] },
  { branch: "巳", en: "Si", th: "มะเส็ง", element: "ไฟ", hiddenStems: ["丙", "戊", "庚"] },
  { branch: "午", en: "Wu", th: "มะเมีย", element: "ไฟ", hiddenStems: ["丁", "己"] },
  { branch: "未", en: "Wei", th: "มะแม", element: "ดิน", hiddenStems: ["己", "丁", "乙"] },
  { branch: "申", en: "Shen", th: "วอก", element: "ทอง", hiddenStems: ["庚", "壬", "戊"] },
  { branch: "酉", en: "You", th: "ระกา", element: "ทอง", hiddenStems: ["辛"] },
  { branch: "戌", en: "Xu", th: "จอ", element: "ดิน", hiddenStems: ["戊", "辛", "丁"] },
  { branch: "亥", en: "Hai", th: "กุน", element: "น้ำ", hiddenStems: ["壬", "甲"] },
];
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

function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function makeStemBranch(index: number): StemBranch {
  const normalized = positiveMod(index, 60);
  const stem = STEMS[normalized % 10];
  const branch = BRANCHES[normalized % 12];
  return {
    index: normalized,
    stem: stem.stem,
    stemEn: stem.en,
    stemTh: stem.th,
    stemElement: stem.element,
    stemPolarity: stem.polarity,
    branch: branch.branch,
    branchEn: branch.en,
    branchTh: branch.th,
    branchElement: branch.element,
    hiddenStems: branch.hiddenStems,
    label: `${stem.stem}${branch.branch} ${stem.en} ${branch.en}`,
  };
}

function julianDayNumber(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const year = y + 4800 - a;
  const month = m + 12 * a - 3;
  return d + Math.floor((153 * month + 2) / 5) + 365 * year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) - 32045;
}

function isBeforeApproxLiChun(date: Date): boolean {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return month < 2 || (month === 2 && day < 4);
}

function getBaziYear(date: Date): number {
  const year = date.getUTCFullYear();
  return isBeforeApproxLiChun(date) ? year - 1 : year;
}

function getApproxSolarMonthIndex(date: Date): number {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const md = month * 100 + day;
  if (md >= 204 && md < 306) return 0;  // Yin
  if (md >= 306 && md < 405) return 1;  // Mao
  if (md >= 405 && md < 506) return 2;  // Chen
  if (md >= 506 && md < 606) return 3;  // Si
  if (md >= 606 && md < 707) return 4;  // Wu
  if (md >= 707 && md < 808) return 5;  // Wei
  if (md >= 808 && md < 908) return 6;  // Shen
  if (md >= 908 && md < 1008) return 7; // You
  if (md >= 1008 && md < 1107) return 8; // Xu
  if (md >= 1107 && md < 1207) return 9; // Hai
  if (md >= 1207 || md < 106) return 10; // Zi
  return 11; // Chou, Jan 6 - Feb 3
}

function getMonthStemStartIndex(yearStemIndex: number): number {
  if (yearStemIndex === 0 || yearStemIndex === 5) return 2; // Jia/Ji -> Bing Yin
  if (yearStemIndex === 1 || yearStemIndex === 6) return 4; // Yi/Geng -> Wu Yin
  if (yearStemIndex === 2 || yearStemIndex === 7) return 6; // Bing/Xin -> Geng Yin
  if (yearStemIndex === 3 || yearStemIndex === 8) return 8; // Ding/Ren -> Ren Yin
  return 0; // Wu/Gui -> Jia Yin
}

function getHourBranchIndex(birthTime?: string): number | null {
  if (!birthTime || birthTime === "ไม่ทราบ") return null;
  const match = birthTime.match(/^([01]\d|2[0-3]):[0-5]\d$/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour === 23 || hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

function getHourStemStartIndex(dayStemIndex: number): number {
  if (dayStemIndex === 0 || dayStemIndex === 5) return 0; // Jia/Ji -> Jia Zi
  if (dayStemIndex === 1 || dayStemIndex === 6) return 2; // Yi/Geng -> Bing Zi
  if (dayStemIndex === 2 || dayStemIndex === 7) return 4; // Bing/Xin -> Wu Zi
  if (dayStemIndex === 3 || dayStemIndex === 8) return 6; // Ding/Ren -> Geng Zi
  return 8; // Wu/Gui -> Ren Zi
}

function makePillarFromStemAndBranch(stemIndex: number, branchIndex: number): StemBranch {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === positiveMod(stemIndex, 10) && i % 12 === positiveMod(branchIndex, 12)) {
      return makeStemBranch(i);
    }
  }
  return makeStemBranch(stemIndex);
}

function buildBazi(date: Date, birthTime?: string): BaziCalculation {
  const baziYear = getBaziYear(date);
  const year = makeStemBranch(baziYear - 1984);
  const yearStemIndex = year.index % 10;
  const solarMonthIndex = getApproxSolarMonthIndex(date);
  const monthStemIndex = getMonthStemStartIndex(yearStemIndex) + solarMonthIndex;
  const monthBranchIndex = (solarMonthIndex + 2) % 12; // Yin month starts at branch index 2.
  const month = makePillarFromStemAndBranch(monthStemIndex, monthBranchIndex);
  const day = makeStemBranch(julianDayNumber(date) + 49); // 2000-01-01 validates to 戊午.
  const hourBranchIndex = getHourBranchIndex(birthTime);
  const hour = hourBranchIndex === null
    ? null
    : makePillarFromStemAndBranch(getHourStemStartIndex(day.index % 10) + hourBranchIndex, hourBranchIndex);

  const elementCounts: Record<string, number> = { ไม้: 0, ไฟ: 0, ดิน: 0, ทอง: 0, น้ำ: 0 };
  for (const pillar of [year, month, day, hour].filter(Boolean) as StemBranch[]) {
    elementCounts[pillar.stemElement] += 1;
    elementCounts[pillar.branchElement] += 1;
    for (const hidden of pillar.hiddenStems) {
      const stem = STEMS.find((s) => s.stem === hidden);
      if (stem) elementCounts[stem.element] += 0.5;
    }
  }

  return {
    formulaVersion: "OMNIA-BAZI-APPROX-SOLAR-v1",
    year,
    month,
    day,
    hour,
    dayMaster: {
      stem: day.stem,
      stemEn: day.stemEn,
      stemTh: day.stemTh,
      element: day.stemElement,
      polarity: day.stemPolarity,
    },
    hourBranchNote: hour
      ? "ยามเกิดคำนวณจากช่วงเวลา 2 ชั่วโมงแบบ BaZi; เวลา 23:00-00:59 ถือเป็นยามชวด"
      : "ไม่มีเวลาเกิดหรือรูปแบบเวลาไม่ชัด จึงยังไม่คำนวณเสายาม",
    elementCounts,
    caveat: "BaZi v1 ใช้ Li Chun และ solar-term boundary แบบประมาณตามวันที่ปฏิทินสากล ไม่ได้คำนวณดวงอาทิตย์เชิงดาราศาสตร์ระดับนาที; คนเกิดใกล้วันเปลี่ยน solar term หรือช่วง 23:00 ควรตรวจด้วยปฏิทินหมื่นปี/Wan Nian Li อีกครั้ง",
  };
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
  const bazi = buildBazi(date, input.birthTime);

  const summaryLines = [
    formatMeaning("เลขเส้นชีวิต", lifePath),
    formatMeaning("เลขวันเกิด", birthDay),
    formatMeaning(`เลขปีส่วนตัว ${now.getUTCFullYear()}`, personalYear),
    taksa.currentAgeBase
      ? `ทักษา: เกิดวัน${taksa.weekdayForTaksa} ดาวประจำวันเกิดคือ ${taksa.birthPlanetName} (${taksa.birthPlanetNumber}); อายุย่าง ${taksa.ageInThaiReading} ตกภูมิ ${taksa.currentAgeBase.base} (${taksa.currentAgeBase.planetName}) — ${taksa.currentAgeBase.meaning}`
      : null,
    `เลข 7 ตัวพื้นฐาน: ${sevenNumber.sevenDigits.join(" ")} (จาก ${sevenNumber.sourceDigits} + เลขรวม ${sevenNumber.reducedNumber}); เลขซ้ำ: ${sevenNumber.repeatedDigits.length ? sevenNumber.repeatedDigits.map((d) => `${d.digit}x${d.count}`).join(", ") : "ไม่มี"}; เลขที่ขาด: ${sevenNumber.missingDigits.slice(0, 5).map((d) => d.digit).join(", ") || "ไม่มี"}`,
    `ข้อจำกัดเลข 7 ตัว: ${sevenNumber.caveat}`,
    `BaZi v1: ปี ${bazi.year.label}, เดือน ${bazi.month.label}, วัน ${bazi.day.label}, ยาม ${bazi.hour ? bazi.hour.label : "ยังไม่คำนวณ"}; Day Master คือ ${bazi.dayMaster.stem} ${bazi.dayMaster.stemEn} (${bazi.dayMaster.element} ${bazi.dayMaster.polarity})`,
    `ธาตุรวม BaZi เบื้องต้น: ${Object.entries(bazi.elementCounts).map(([element, count]) => `${element} ${count}`).join(", ")}`,
    `ข้อจำกัด BaZi: ${bazi.caveat}`,
  ].filter(Boolean) as string[];

  return {
    lifePath,
    birthDay,
    personalYear,
    taksa,
    sevenNumber,
    bazi,
    json: {
      numerology: { lifePath, birthDay, personalYear },
      taksa,
      sevenNumber,
      bazi,
    },
    summaryText: summaryLines.join("\n"),
  };
}
