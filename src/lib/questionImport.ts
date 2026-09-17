/**
 * Import chegarasi — KLIENT ham ishlatadi (forma izohida), shuning uchun
 * `services/questionImport.ts` dan alohida: u yerda Prisma bor va uni
 * brauzer paketiga tortib kirish mumkin emas.
 *
 * Nega chegara bor: import bitta tranzaksiyada yoziladi. Juda katta
 * ro'yxat bazani uzoq band qilib turadi va so'rov vaqti tugab, yarmida
 * uzilishi mumkin edi.
 */
export const MAX_IMPORT_QUESTIONS = 500;
