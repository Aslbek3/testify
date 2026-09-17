import { prisma } from "@/lib/prisma";
import { ORGANIZATION_SWITCH_SELECT } from "@/services/auth";
import type { OrganizationSwitches } from "@/types/auth";

/**
 * Rol kalitlari (`docs/rollar.md`) — direktor sozlamalari ekrani uchun.
 *
 * O'qish sessiya tekshiruvidagi bilan AYNI ustunlardan
 * (`ORGANIZATION_SWITCH_SELECT`): ekranda ko'rinadigan holat bilan
 * ruxsat tekshiruvida ishlatiladigan holat hech qachon ajralib
 * qolmasin.
 */
export async function getOrganizationSwitches(
  organizationId: string
): Promise<OrganizationSwitches | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: ORGANIZATION_SWITCH_SELECT,
  });
  return org ?? null;
}

export async function updateOrganizationSwitches(
  organizationId: string,
  switches: OrganizationSwitches
): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: switches,
  });
}
