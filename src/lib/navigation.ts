import type { Role } from "@prisma/client";
import { ROLE_HOME } from "@/lib/roles";

/**
 * Yo'l ko'rsatkichning (`Breadcrumb`) BIRINCHI bandi — foydalanuvchi qaysi
 * paneldan kelganiga qarab.
 *
 * Obyekt sahifalari (`/guruh/[id]`, `/ustoz/[id]`, `/oquvchi/[id]`) barcha
 * rollar uchun umumiy, lekin "orqaga" har rolda boshqa joyga olib borishi
 * kerak: ustoz o'z guruhlariga, direktor jurnalga, qabulxona o'z paneliga.
 *
 * Havola URL parametridan OLINMAYDI: "qayerdan kelding" degan ma'lumotni
 * manzilga yozish uni soxtalashtirishga imkon beradi va havolani nusxalab
 * yuborilganda noto'g'ri yo'l ko'rsatadi. Rol esa sessiyadan keladi va
 * doim to'g'ri.
 */
const HOME_LABEL: Record<Role, string> = {
  OWNER: "Owner paneli",
  DIRECTOR: "Direktor paneli",
  RECEPTION: "Qabulxona",
  TUTOR: "Guruhlarim",
  STUDENT: "Bosh sahifa",
};

export function homeCrumbFor(role: Role): { label: string; href: string } {
  return { label: HOME_LABEL[role], href: ROLE_HOME[role] };
}
