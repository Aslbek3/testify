import { prisma } from "@/lib/prisma";
import type { Plan, OrganizationStatus, Prisma } from "@prisma/client";

/**
 * Tashkilot bilan bog'liq domen xatolari (topilmadi, noto'g'ri qiymat).
 * API route buni ushlab, foydalanuvchiga tushunarli xabar bilan 400/404
 * qaytaradi — `services/questions.ts` dagi `QuestionBankError` bilan bir xil
 * uslub.
 */
export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
  }
}

/**
 * Alohida tur — route uni 400 emas, 404 bilan qaytarishi uchun. Bitta
 * `OrganizationError` bo'lsa, route xato MATNINI tekshirishga majbur
 * bo'lardi (matn o'zgarganda status kod jimgina noto'g'ri bo'lib qolardi).
 */
export class OrganizationNotFoundError extends OrganizationError {
  constructor() {
    super("Tashkilot topilmadi");
    this.name = "OrganizationNotFoundError";
  }
}

/**
 * Klientdan kelgan matnni enum qiymatiga aylantiradi (mos kelmasa `null`).
 *
 * Ro'yxatlar ataylab shu yerda — service qatlamida — turadi: ilgari ular
 * faqat POST route ichida edi va PATCH route yozilganda ikkinchi nusxa
 * paydo bo'lar edi. Enumga yangi tarif qo'shilsa bitta joy o'zgaradi.
 */
const VALID_PLANS: Plan[] = ["START", "STANDARD", "PRO"];
const VALID_STATUSES: OrganizationStatus[] = ["ACTIVE", "TRIAL", "EXPIRED"];

export function parsePlan(value: unknown): Plan | null {
  return VALID_PLANS.includes(value as Plan) ? (value as Plan) : null;
}

export function parseOrganizationStatus(
  value: unknown
): OrganizationStatus | null {
  return VALID_STATUSES.includes(value as OrganizationStatus)
    ? (value as OrganizationStatus)
    : null;
}

export type OrganizationWithCounts = {
  id: string;
  name: string;
  city: string;
  plan: Plan;
  status: OrganizationStatus;
  createdAt: Date;
  /** Obuna qachongacha amal qiladi. `null` — muddat belgilanmagan. */
  subscriptionEndsAt: Date | null;
  /** Bloklanmagan (`isActive`) hisoblar soni — Qoida 5 ga qara. */
  tutorCount: number;
  /** Bloklanmagan va guruhga biriktirilgan o'quvchilar soni. */
  studentCount: number;
  /**
   * Bloklanmagan direktorlar soni. Jadvalda alohida ustun sifatida
   * ko'rsatilmaydi — u tahrirlash modalidagi ogohlantirish uchun kerak:
   * holat `EXPIRED` ga o'tkazilganda direktor ham qolgan hammasi bilan
   * birga tizimdan chiqariladi, ya'ni "necha kishiga ta'sir qiladi"
   * degan raqamda u ham bo'lishi shart.
   */
  directorCount: number;
};

// "studentCount" Prisma ustuni emas (alohida groupBy so'rovi bilan sanaladi),
// shuning uchun uni saralash faqat olingan massiv ustida amalga oshiriladi —
// "name" va "createdAt" uchun esa haqiqiy Prisma ustuni bo'lgani sababli
// orderBy'da saralanadi.
export type OrganizationSortField = "name" | "studentCount" | "createdAt";
export type OrganizationSortDirection = "asc" | "desc";

export type ListOrganizationsParams = {
  q?: string;
  status?: OrganizationStatus;
  sortField?: OrganizationSortField;
  sortDirection?: OrganizationSortDirection;
};

export async function listOrganizations(
  params: ListOrganizationsParams = {}
): Promise<OrganizationWithCounts[]> {
  const { q, status, sortField = "createdAt", sortDirection = "desc" } = params;

  const where: Prisma.OrganizationWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const organizations = await prisma.organization.findMany({
    where,
    orderBy:
      sortField === "name"
        ? { name: sortDirection }
        : sortField === "createdAt"
          ? { createdAt: sortDirection }
          : { createdAt: "desc" },
  });

  // Ustoz/o'quvchi sonlari bazaning o'zida sanaladi: har bir tashkilotning
  // barcha user qatorlarini yuklab, JS'da filter qilish o'rniga bitta
  // groupBy — natijada tashkilot boshiga ko'pi bilan ikkita qator qaytadi.
  //
  // `isActive: true` — bloklangan hisob endi sanoqqa kirmaydi. Ilgari 100
  // o'quvchidan 30 tasi bloklangan tashkilot ham "100" ko'rsatardi, ya'ni
  // tarif/hisob-kitob qarori uchun ishlatilsa 30% xato raqam edi.
  //
  // O'quvchi uchun qo'shimcha `studentProfile: { isNot: null }` sharti —
  // direktorning o'z ro'yxati (`listStudentsForOrganization`) guruh profili
  // yo'q o'quvchini ko'rsatmaydi; shart bo'lmasa owner "50", direktor esa
  // "48" ko'rardi. Shart faqat STUDENT shoxida: ustozda profil bo'lmaydi.
  const counts =
    organizations.length === 0
      ? []
      : await prisma.user.groupBy({
          by: ["organizationId", "role"],
          where: {
            organizationId: { in: organizations.map((org) => org.id) },
            isActive: true,
            OR: [
              { role: "TUTOR" },
              { role: "DIRECTOR" },
              { role: "STUDENT", studentProfile: { isNot: null } },
            ],
          },
          _count: { _all: true },
        });

  type OrgCounts = { tutorCount: number; studentCount: number; directorCount: number };
  const emptyCounts = (): OrgCounts => ({
    tutorCount: 0,
    studentCount: 0,
    directorCount: 0,
  });

  const countByOrg = new Map<string, OrgCounts>();
  for (const row of counts) {
    if (!row.organizationId) continue;
    const entry = countByOrg.get(row.organizationId) ?? emptyCounts();
    // `else` emas, aniq `switch` — ilgari "TUTOR bo'lmasa o'quvchi" degan
    // shart bor edi va DIRECTOR qo'shilganda direktorlar jimgina
    // o'quvchilar soniga qo'shilib ketardi.
    if (row.role === "TUTOR") entry.tutorCount = row._count._all;
    else if (row.role === "DIRECTOR") entry.directorCount = row._count._all;
    else if (row.role === "STUDENT") entry.studentCount = row._count._all;
    countByOrg.set(row.organizationId, entry);
  }

  const mapped = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    city: org.city,
    plan: org.plan,
    status: org.status,
    createdAt: org.createdAt,
    subscriptionEndsAt: org.subscriptionEndsAt,
    tutorCount: countByOrg.get(org.id)?.tutorCount ?? 0,
    studentCount: countByOrg.get(org.id)?.studentCount ?? 0,
    directorCount: countByOrg.get(org.id)?.directorCount ?? 0,
  }));

  if (sortField === "studentCount") {
    mapped.sort((a, b) =>
      sortDirection === "asc"
        ? a.studentCount - b.studentCount
        : b.studentCount - a.studentCount
    );
  }

  return mapped;
}

export type PlatformOverview = {
  organizationCount: number;
  activeOrganizationCount: number;
  /** Butun platforma bo'yicha bloklanmagan o'quvchi hisoblari. */
  studentCount: number;
  /** Shundan holati "Faol" bo'lgan tashkilotlardagilari. */
  activeOrganizationStudentCount: number;
};

/**
 * Owner panelidagi plitkalar uchun. Plitkalar filtrga bog'liq bo'lmasligi
 * kerak, lekin buning uchun ilgari `listOrganizations()` ikkinchi marta —
 * filtrsiz — chaqirilardi va natijadan faqat uchta yig'indi olinardi. Endi
 * uchta `count` so'rovi ketadi, tashkilot qatorlari umuman yuklanmaydi.
 *
 * Sonlar `isActive: true` bo'yicha — "faol" bu yerda "hisobi bloklanmagan"
 * degani; tashkilot holati (ACTIVE/TRIAL/EXPIRED) esa butunlay boshqa narsa
 * va u alohida ko'rsatiladi.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const activeStudentWhere: Prisma.UserWhereInput = {
    role: "STUDENT",
    isActive: true,
    studentProfile: { isNot: null },
  };

  const [
    organizationCount,
    activeOrganizationCount,
    studentCount,
    activeOrganizationStudentCount,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: activeStudentWhere }),
    prisma.user.count({
      where: { ...activeStudentWhere, organization: { status: "ACTIVE" } },
    }),
  ]);

  return {
    organizationCount,
    activeOrganizationCount,
    studentCount,
    activeOrganizationStudentCount,
  };
}

/** "Yangi direktor" modalidagi tashkilot tanlash ro'yxati uchun. */
export async function listOrganizationOptions(): Promise<
  { id: string; name: string }[]
> {
  return prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Tashkilotni tahrirlash — nom, shahar, tarif rejasi va holat.
 *
 * Barcha maydonlar ixtiyoriy (qisman yangilash): berilmagan maydon
 * bazada o'z holicha qoladi. Shu sababli `undefined` va "bo'sh qiymat"
 * farqlanadi — `name: undefined` "tegma" degani, `name: ""` esa xato.
 *
 * `plan`/`status` bu yerda QAYTA tekshiriladi (route allaqachon tekshirsa
 * ham): service qatlami o'ziga kelgan qiymatga ishonmaydi, chunki uni
 * ertaga boshqa route yoki skript ham chaqirishi mumkin. Prisma tekshiruvi
 * yetarli emas — u faqat baza xatosini beradi, foydalanuvchiga o'zbekcha
 * xabar emas.
 *
 * ⚠️ `status: "EXPIRED"` — bu shunchaki yorliq emas: `getVerifiedSessionUser`
 * (`src/lib/auth.ts`) har so'rovda tashkilot holatini tekshirgani uchun shu
 * tashkilotning barcha direktor/ustoz/o'quvchilari darhol tizimdan
 * chiqariladi va qayta kira olmaydi (login ham `OrganizationExpiredError`
 * bilan rad etiladi). Shuning uchun `sessionVersion`ni oshirish kerak emas —
 * mexanizm allaqachon holatga qarab ishlaydi; ogohlantirish esa UI'da
 * (EditOrganizationModal) beriladi.
 */
export async function updateOrganization(
  id: string,
  input: {
    name?: string;
    city?: string;
    plan?: Plan;
    status?: OrganizationStatus;
  }
) {
  const data: Prisma.OrganizationUpdateInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new OrganizationError("Tashkilot nomi bo'sh bo'lishi mumkin emas");
    }
    data.name = name;
  }

  if (input.city !== undefined) {
    const city = input.city.trim();
    if (!city) {
      throw new OrganizationError("Shahar bo'sh bo'lishi mumkin emas");
    }
    data.city = city;
  }

  if (input.plan !== undefined) {
    if (!parsePlan(input.plan)) {
      throw new OrganizationError("Noto'g'ri tarif rejasi");
    }
    data.plan = input.plan;
  }

  if (input.status !== undefined) {
    if (!parseOrganizationStatus(input.status)) {
      throw new OrganizationError("Noto'g'ri holat");
    }
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) {
    throw new OrganizationError("O'zgartirish uchun hech qanday maydon berilmadi");
  }

  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new OrganizationNotFoundError();
  }

  return prisma.organization.update({ where: { id }, data });
}

export async function createOrganization(input: {
  name: string;
  city: string;
  plan: Plan;
  status?: OrganizationStatus;
}) {
  return prisma.organization.create({
    data: {
      name: input.name,
      city: input.city,
      plan: input.plan,
      status: input.status ?? "TRIAL",
    },
  });
}
