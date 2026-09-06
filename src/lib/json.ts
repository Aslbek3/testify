import type { Prisma } from "@prisma/client";

/** Question.options kabi Prisma Json ustunlarini string[] ga xavfsiz aylantiradi. */
export function toStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}
