import { redirect } from "next/navigation";

/**
 * Eski manzil. Rejimlar endi navigatsiyada alohida bo'lim sifatida turadi
 * (Mashq / Maraton / Imtihon), shuning uchun bu sahifa o'z mazmunini
 * yo'qotdi. Eski havolalar va xatcho'plar buzilmasligi uchun o'chirilmasdan
 * yo'naltirishga aylantirilgan.
 */
export default function BoshlashPage() {
  redirect("/student/mashq");
}
