/**
 * Yo'l belgilari katalogi.
 *
 * ⚠️ **DEMO HOLATI (2026-09-26).** Har bir guruhda atigi 2-3 ta belgi bor —
 * bu to'liq ro'yxat emas, shaklni ko'rsatish uchun. Haqiqiy son
 * (`totalCount`) har guruhda yozilgan, ya'ni ekran "8 tadan 2 tasi
 * kiritilgan" deb ochiq aytadi. Qolgani keyin to'ldiriladi.
 *
 * Nega bazada emas, kodda (`shpargalkalar.ts` bilan bir xil sabab):
 * belgilar YHQ o'zgarganda o'zgaradi, ya'ni juda kam, va ularni faqat
 * dasturchi yangilaydi. Baza jadvali bo'lsa, unga owner uchun tahrirlash
 * va rasm yuklash ekrani ham kerak bo'lardi. Kontent to'lgach ko'chirish
 * oson — shakl o'zgarmaydi.
 *
 * Rasm hozircha YO'Q. Uning o'rniga guruhning SHAKLI va RANGI chiziladi
 * (uchburchak/doira/to'rtburchak, qizil/ko'k). Bu bo'sh to'rtburchakdan
 * yaxshiroq: YHQ'da belgining shakli va rangi allaqachon ma'no bildiradi —
 * qizil uchburchak ogohlantiradi, qizil doira taqiqlaydi, ko'k doira
 * buyuradi. Haqiqiy rasm qo'shilganda `imageUrl` to'ldiriladi.
 */

/** Belgi shakli — rasmsiz ko'rsatish uchun. */
export type SignShape =
  | "triangle"
  | "circle"
  | "square"
  | "diamond"
  | "octagon";

export type RoadSign = {
  /** YHQ'dagi raqam — masalan "1.1". */
  code: string;
  name: string;
  /** Bir-ikki jumlalik ma'nosi. */
  meaning: string;
  /** Haqiqiy rasm qo'shilganda to'ldiriladi. */
  imageUrl?: string;
};

export type SignGroup = {
  slug: string;
  title: string;
  /** Guruhning vazifasi — bir jumlada. */
  summary: string;
  shape: SignShape;
  /** Shakl va matn rangini beruvchi sinf — `SignShapeMark` uni
   *  `currentColor` orqali ishlatadi. */
  toneClass: string;
  /**
   * YHQ'dagi HAQIQIY belgilar soni. `signs.length` dan katta bo'lsa,
   * ekran "nechtasi kiritilgani" ni ochiq ko'rsatadi.
   */
  totalCount: number;
  signs: RoadSign[];
};

export const SIGN_GROUPS: SignGroup[] = [
  {
    slug: "ogohlantiruvchi",
    title: "Ogohlantiruvchi belgilar",
    summary: "Yo'lda xavfli qism borligidan ogohlantiradi va ehtiyot bo'lishni talab qiladi.",
    shape: "triangle",
    toneClass: "text-danger",
    totalCount: 51,
    signs: [
      {
        code: "1.1",
        name: "Shlagbaumli temir yo'l kesishmasi",
        meaning: "Oldinda shlagbaum bilan jihozlangan temir yo'l kesishmasi bor.",
      },
      {
        code: "1.11",
        name: "Xavfli burilish",
        meaning: "Ko'rinish chegaralangan burilish — tezlikni oldindan pasaytirish kerak.",
      },
      {
        code: "1.22",
        name: "Piyodalar o'tish joyi",
        meaning: "Oldinda belgilangan piyoda o'tish joyi bor.",
      },
    ],
  },
  {
    slug: "imtiyoz",
    title: "Imtiyoz belgilari",
    summary: "Chorraha yoki tor qismda kim birinchi o'tishini belgilaydi.",
    shape: "diamond",
    toneClass: "text-warning",
    totalCount: 9,
    signs: [
      {
        code: "2.1",
        name: "Bosh yo'l",
        meaning: "Shu yo'ldan borayotgan haydovchi chorrahada ustunlikka ega.",
      },
      {
        code: "2.4",
        name: "Yo'l bering",
        meaning: "Kesib o'tilayotgan yo'ldan kelayotganlarga yo'l berish shart.",
      },
      {
        code: "2.5",
        name: "To'xtamasdan harakatlanish taqiqlanadi",
        meaning: "To'xtash chizig'i oldida majburiy to'xtash, keyin yo'l berish.",
      },
    ],
  },
  {
    slug: "taqiqlovchi",
    title: "Taqiqlovchi belgilar",
    summary: "Ayrim harakatlarni taqiqlaydi yoki cheklov kiritadi.",
    shape: "circle",
    toneClass: "text-danger",
    totalCount: 39,
    signs: [
      {
        code: "3.1",
        name: "Kirish taqiqlangan",
        meaning: "Barcha transport vositalarining shu yo'nalishda kirishi taqiqlanadi.",
      },
      {
        code: "3.24",
        name: "Eng katta tezlikni cheklash",
        meaning: "Belgida ko'rsatilgan tezlikdan oshib harakatlanish taqiqlanadi.",
      },
      {
        code: "3.27",
        name: "To'xtash taqiqlangan",
        meaning: "Transport vositasini to'xtatish ham, qo'yish ham taqiqlanadi.",
      },
    ],
  },
  {
    slug: "buyuruvchi",
    title: "Buyuruvchi belgilar",
    summary: "Harakatning aniq yo'nalishini yoki shartini buyuradi.",
    shape: "circle",
    toneClass: "text-info",
    totalCount: 25,
    signs: [
      {
        code: "4.1.1",
        name: "To'g'riga harakatlanish",
        meaning: "Faqat belgida ko'rsatilgan yo'nalishda harakatlanishga ruxsat.",
      },
      {
        code: "4.3",
        name: "Aylanma harakat",
        meaning: "Belgilangan yo'nalishda aylanib o'tish shart.",
      },
    ],
  },
  {
    slug: "axborot-ishora",
    title: "Axborot-ishora belgilari",
    summary: "Aholi punktlari, yo'l rejimi va joylashuv haqida xabar beradi.",
    shape: "square",
    toneClass: "text-info",
    totalCount: 87,
    signs: [
      {
        code: "5.1",
        name: "Avtomagistral",
        meaning: "Avtomagistral boshlanadi — shu yo'lning maxsus qoidalari kuchga kiradi.",
      },
      {
        code: "5.19.1",
        name: "Piyodalar o'tish joyi",
        meaning: "Belgilangan piyoda o'tish joyini ko'rsatadi.",
      },
      {
        code: "5.23.1",
        name: "Aholi punktining boshlanishi",
        meaning: "Aholi punkti qoidalari (jumladan tezlik chegarasi) shu yerdan boshlanadi.",
      },
    ],
  },
  {
    slug: "servis",
    title: "Servis belgilari",
    summary: "Yo'l bo'yidagi xizmat joylari: shifoxona, yoqilg'i, oshxona.",
    shape: "square",
    toneClass: "text-info",
    totalCount: 18,
    signs: [
      {
        code: "6.1",
        name: "Tibbiy yordam punkti",
        meaning: "Yaqin atrofda tibbiy yordam punkti borligini bildiradi.",
      },
      {
        code: "6.3",
        name: "Yoqilg'i quyish shoxobchasi",
        meaning: "Yaqin atrofda yoqilg'i quyish shoxobchasi bor.",
      },
    ],
  },
  {
    slug: "qoshimcha-axborot",
    title: "Qo'shimcha axborot belgilari",
    summary: "Asosiy belgining ta'sirini aniqlashtiradi: masofa, vaqt, transport turi.",
    shape: "square",
    toneClass: "text-text-muted",
    totalCount: 61,
    signs: [
      {
        code: "7.1.1",
        name: "Obyektgacha masofa",
        meaning: "Belgidan obyektgacha bo'lgan masofani ko'rsatadi (masalan 300 m).",
      },
      {
        code: "7.2.1",
        name: "Ta'sir doirasi",
        meaning: "Asosiy belgining ta'siri qancha masofaga yoyilishini bildiradi.",
      },
    ],
  },
  {
    slug: "tanish-belgilari",
    title: "Transport vositalarining tanish belgilari",
    summary: "Transport vositasining o'ziga yopishtiriladigan belgilar.",
    shape: "triangle",
    toneClass: "text-warning",
    totalCount: 14,
    signs: [
      {
        code: "8.1",
        name: "Avtopoyezd",
        meaning: "Tirkamali yuk avtomobili yoki avtobusga o'rnatiladi.",
      },
      {
        code: "8.4",
        name: "Tajribasiz haydovchi",
        meaning: "Haydovchilik staji ikki yildan kam bo'lgan haydovchi.",
      },
    ],
  },
];

export function getSignGroup(slug: string): SignGroup | undefined {
  return SIGN_GROUPS.find((group) => group.slug === slug);
}

/** Kiritilgan va jami belgilar soni — "demo" holatini ochiq ko'rsatish uchun. */
export function signCatalogProgress(): { loaded: number; total: number } {
  return {
    loaded: SIGN_GROUPS.reduce((sum, g) => sum + g.signs.length, 0),
    total: SIGN_GROUPS.reduce((sum, g) => sum + g.totalCount, 0),
  };
}
