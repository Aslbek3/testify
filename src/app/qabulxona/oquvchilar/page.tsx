import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listStudentsForOrganization,
  countStudentsForOrganization,
  listGroupsForOrganization,
} from "@/services/directorDashboard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { StudentFilters } from "@/components/StudentFilters";
import { StudentsTable } from "@/components/StudentsTable";
import { NewStudentModal } from "@/components/NewStudentModal";
import { describeStudentAccess } from "@/lib/labels";
import { getStudentAccessMap, getStudentPaymentSettings } from "@/services/studentPayments";

/**
 * Qabulxonaning o'quvchilar ro'yxati — direktornikining AYNI o'zi
 * (bir xil komponentlar, bir xil API), farqi faqat sarlavhada va
 * "Naqd" tugmasida: u "Qabulxona pul bilan ishlaydi" kalitiga bog'liq.
 *
 * Tugmalarni yashirish — qulaylik uchun. Haqiqiy cheklov serverda:
 * `/api/students*` va `/api/student-payments/cash` har so'rovda
 * `permissions.ts` orqali tekshiriladi.
 */
export default async function ReceptionStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const user = await requireRole("RECEPTION");
  const { q, group } = await searchParams;

  if (!user.organizationId) {
    return (
      <p className="text-sm text-text-muted">
        Siz hech qaysi avtomaktabga biriktirilmagansiz. Direktoringizga murojaat qiling.
      </p>
    );
  }
  const organizationId = user.organizationId;

  const [totalStudentCount, students, groups, paymentSettings] = await Promise.all([
    countStudentsForOrganization(organizationId),
    listStudentsForOrganization(organizationId, { q, groupId: group }),
    listGroupsForOrganization(organizationId),
    getStudentPaymentSettings(organizationId),
  ]);
  const accessMap = await getStudentAccessMap(students.map((s) => s.studentId));
  const paymentColumn = students.map((s) => ({
    studentId: s.studentId,
    ...describeStudentAccess(accessMap.get(s.studentId) ?? { kind: "free" }),
  }));

  // Naqd to'lovni faqat kalit yoqilgan qabulxona belgilay oladi.
  const showPayments = paymentSettings.enabled && user.switches.receptionHandlesPayments;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
            O&apos;quvchilar
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Yangi o&apos;quvchi qo&apos;shish, guruhini o&apos;zgartirish, parolini
            tiklash va hisobini bloklash shu yerdan.
          </p>
        </div>
        <NewStudentModal groups={groups} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ro&apos;yxat</CardTitle>
          <span className="text-sm text-text-muted">{students.length} ta o&apos;quvchi</span>
        </CardHeader>

        <StudentFilters groups={groups} basePath="/qabulxona/oquvchilar" />

        {totalStudentCount === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Hozircha avtomaktabda o&apos;quvchilar yo&apos;q. Birinchisini
            &quot;O&apos;quvchi qo&apos;shish&quot; bilan kiriting.
          </p>
        ) : students.length === 0 ? (
          <div className="mt-4 space-y-3 py-6 text-center">
            <p className="text-sm text-text-muted">Hech narsa topilmadi</p>
            <Link href="/qabulxona/oquvchilar">
              <Button type="button" variant="secondary">
                Filtrni tozalash
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <StudentsTable
              studentBasePath="/oquvchi"
              groupBasePath="/guruh"
              students={students}
              groups={groups}
              // "Qabulxona natijalarni ko'radi" kaliti — o'chirilgan bo'lsa
              // ball va progress ustunlari chizilmaydi.
              showProgress={user.switches.receptionSeesProgress}
              payments={
                showPayments
                  ? {
                      byStudent: Object.fromEntries(
                        paymentColumn.map(({ studentId, ...rest }) => [studentId, rest])
                      ),
                      prices: {
                        1: paymentSettings.priceOneMonth!,
                        6: paymentSettings.priceSixMonths!,
                      },
                    }
                  : null
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
