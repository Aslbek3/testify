import type { IconName } from "@/components/Icon";

/**
 * Shpargalkalar — imtihonda ko'p uchraydigan, yodlash qiyin raqamlar.
 *
 * Nega kerak: platformada faqat SAVOLLAR bor edi, o'qib yodlaydigan
 * ma'lumotnoma yo'q edi. O'quvchi "aholi punktidan tashqarida yengil
 * avto uchun tezlik qancha?" degan savolga xato javob bersa, izohni
 * o'qiydi — lekin butun jadvalni bir joyda ko'ra olmaydi.
 *
 * Nega bazada emas, kodda: bu ma'lumot YHQ o'zgarganda o'zgaradi, ya'ni
 * yiliga bir-ikki marta, va uni faqat dasturchi yangilaydi. Baza jadvali
 * bo'lsa, unga owner uchun tahrirlash ekrani ham kerak bo'lardi — hozircha
 * bu ishga arzimaydi. Kerak bo'lganda ko'chirish oson: shakl o'zgarmaydi.
 *
 * ⚠️ MUHIM: bu raqamlar YHQ'ning rasmiy matni bilan SOLISHTIRILISHI shart.
 * Ular dastlab raqobatchi ilovaning ekranidan ko'chirilgan (2026-09-26) va
 * hali tekshirilmagan. Noto'g'ri raqam — o'quvchini imtihonda yiqitadi,
 * shuning uchun har bir jadvalning `verified` maydoni bor va tekshirilmagan
 * jadval ekranda ochiq ogohlantirish bilan chiziladi.
 */

export type CheatRow = {
  /** Chapdagi katta qiymat — "100", "5 ball". */
  value: string;
  /** Qiymat yonidagi kichik birlik — "km/soat". `undefined` bo'lsa chizilmaydi. */
  unit?: string;
  /** O'ngdagi tavsif. */
  label: string;
  /** Tavsif ostidagi qo'shimcha shart. */
  note?: string;
};

export type CheatSection = {
  title: string;
  rows: CheatRow[];
};

export type CheatSheet = {
  /** URL'dagi qism: `/student/shpargalka/<slug>`. */
  slug: string;
  title: string;
  /** Ro'yxatdagi bir qatorlik izoh. */
  summary: string;
  icon: IconName;
  /** Ikonka doirasining ohangi — `globals.css` tokenlari. */
  tone: string;
  sections: CheatSection[];
  /**
   * Raqamlar YHQ bilan solishtirilganmi.
   *
   * `false` — ekranda ogohlantirish chiziladi. Tekshirilgach shu qiymat
   * `true` qilinadi va manba (`source`) yoziladi.
   */
  verified: boolean;
  /** Tekshirilgandan keyin: qaysi hujjatning qaysi bandi. */
  source?: string;
};

export const CHEAT_SHEETS: CheatSheet[] = [
  {
    slug: "tezlik",
    title: "Ruxsat etilgan tezlik",
    summary: "Aholi punktidan tashqarida va maxsus joylarda",
    icon: "flame",
    tone: "bg-danger-soft text-danger",
    verified: false,
    sections: [
      {
        title: "Aholi punktlaridan tashqarida",
        rows: [
          { value: "100", unit: "km/soat", label: "Yengil avtomobil" },
          { value: "100", unit: "km/soat", label: "3,5 tonnagacha yuk avtomobili" },
          { value: "90", unit: "km/soat", label: "Shaharlararo avtobus va mikroavtobus" },
          { value: "80", unit: "km/soat", label: "Avtobus" },
          { value: "80", unit: "km/soat", label: "Yuk avtomobili" },
          { value: "80", unit: "km/soat", label: "Mototsikl" },
          { value: "70", unit: "km/soat", label: "Tirkamali yuk avtomobili" },
        ],
      },
      {
        title: "Maxsus tezlik chegaralari",
        rows: [
          { value: "50", unit: "km/soat", label: "Transport vositasini shatakka olganda" },
          { value: "30", unit: "km/soat", label: "Maktab va bog'cha oldida" },
          { value: "20", unit: "km/soat", label: "Turar joy dahasida" },
        ],
      },
    ],
  },
  {
    slug: "jarima-ballari",
    title: "Xatolik uchun jarima ballar",
    summary: "Amaliy imtihonda kichik xatoliklar",
    icon: "alertTriangle",
    tone: "bg-warning-soft text-warning",
    verified: false,
    sections: [
      {
        title: "Kichik xatolik",
        rows: [
          { value: "5", unit: "ball", label: "Xavfsizlik kamarini taqmadi" },
          {
            value: "5",
            unit: "ball",
            label: "Chapga burilish chirog'ini yoqmasdan \"Start\" chizig'ini kesib o'tdi",
          },
          {
            value: "5",
            unit: "ball",
            label: "\"Start\" chizig'idan keyin 10 metr masofada chapga burilish chirog'ini o'chirmadi",
          },
          {
            value: "5",
            unit: "ball",
            label: "\"To'xtash chizig'i\"dan oldin 1 metrdan ko'proq masofada to'xtatdi",
          },
          {
            value: "5",
            unit: "ball",
            label: "Tegishli yo'nalishdagi burilish chirog'ini yoqmadi",
          },
          {
            value: "5",
            unit: "ball",
            label: "4.7 va 3.24 yo'l belgilarining talablarini buzdi",
          },
          {
            value: "5",
            unit: "ball",
            label:
              "\"Harakatlanishni yakunlash (Finish)\" chizig'ini kesib o'tishdan oldin o'ngga burilish ishorasini yoqmadi",
          },
          {
            value: "5",
            unit: "ball",
            label: "Harakatlanish tezligini 20 km/soatdan oshirib yubordi",
            note: "Har 5 soniya uchun. \"Yo'lning tezlashish qismida harakatlanish\" mashqini bajarishdan tashqari",
          },
        ],
      },
    ],
  },
];

export function getCheatSheet(slug: string): CheatSheet | undefined {
  return CHEAT_SHEETS.find((sheet) => sheet.slug === slug);
}
