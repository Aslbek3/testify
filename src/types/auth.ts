import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  organizationId: string | null;
};
