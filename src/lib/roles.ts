import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  OWNER: "/owner",
  DIRECTOR: "/director",
  RECEPTION: "/qabulxona",
  TUTOR: "/tutor",
  STUDENT: "/student",
};

/**
 * Rol nomi — sidebar'da ham, profil sahifasida ham AYNI shu. Ilgari
 * ikkita nusxa bor edi va yangi rol qo'shilganda biri unutilishi oson edi.
 */
export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "App Owner",
  DIRECTOR: "Direktor",
  RECEPTION: "Qabulxona",
  TUTOR: "Ustoz",
  STUDENT: "O'quvchi",
};
