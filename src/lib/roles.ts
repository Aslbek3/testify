import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  OWNER: "/owner",
  DIRECTOR: "/director",
  TUTOR: "/tutor",
  STUDENT: "/student",
};
