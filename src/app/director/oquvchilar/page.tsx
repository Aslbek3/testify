import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  listStudentsForOrganization,
  countStudentsForOrganization,
  listGroupsForOrganization,
} from "@/services/directorDashboard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { StudentFilters } from "./StudentFilters";
import { StudentsTable } from "./StudentsTable";
import { describeStudentAccess } from "@/lib/labels";
import {
  getStudentAccessMap,
  getStudentPaymentSettings,
} from "@/services/studentPayments";
import { NewStudentModal } from "./NewStudentModal";

export default async function DirectorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  const { q, group } = await searchParams;

  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return (
      <p className="text-sm text-text-muted">
        Tashkilotga biriktirilmagansiz. Iltimos, administrator bilan
        bog&apos;laning.
      </p>
    );
  }

  const organizationId = user.organizationId;

  // "Umuman o'quvchi bormi?" (bo'sh holat) va "filtrga hech narsa tushmadi"
  // ikki xil holat. Birinchisi uchun ilgari butun ro'yxat ikkinchi marta
  // yuklanardi va undan faqat `.length` olinardi — endi oddiy `count`.
  const [totalStudentCount, students, groups, paymentSettings] = await Promise.all([
    countStudentsForOrganization(organizationId),
    listStudentsForOrganization(organizationId, { q, groupId: group }),
    listGroupsForOrganization(organizationId),
    getStudentPaymentSettings(organizationId),
  ]);
  // To'lov holati ro'yxatdagi o'quvchilar uchun — bitta so'rovda.
  const accessMap = await getStudentAccessMap(students.map((s) => s.studentId));
  const paymentColumn = students.map((s) => ({
    studentId: s.studentId,
    ...describeStudentAccess(accessMap.get(s.studentId) ?? { kind: "free" }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">O&apos;quvchilar</h1>
          <p className="mt-1 text-sm text-text-muted">
            Tashkilotingizdagi barcha o&apos;quvchilar — guruhini
            o&apos;zgartirish, parolini tiklash yoki hisobini bloklash shu
            yerdan.
          </p>
        </div>
        <NewStudentModal groups={groups} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ro&apos;yxat</CardTitle>
          <span className="text-sm text-text-muted">
            {students.length} ta o&apos;quvchi
          </span>
        </CardHeader>

        <StudentFilters groups={groups} />

        {totalStudentCount === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Hozircha tashkilotingizda o&apos;quvchilar yo&apos;q.
          </p>
        ) : students.length === 0 ? (
          <div className="mt-4 space-y-3 py-6 text-center">
            <p className="text-sm text-text-muted">Hech narsa topilmadi</p>
            <Link href="/director/oquvchilar">
              <Button type="button" variant="secondary">
                Filtrni tozalash
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <StudentsTable
              students={students}
              groups={groups}
              // To'lov o'chiq bo'lsa ustun ham, "Naqd" tugmasi ham ko'rsatilmaydi.
              payments={
                paymentSettings.enabled
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
