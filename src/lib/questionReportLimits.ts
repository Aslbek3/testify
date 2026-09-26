/**
 * Shikoyat izohining uzunlik chegarasi.
 *
 * Alohida faylda, chunki uni HAM server (`services/questionReports.ts`,
 * u Prisma'ni import qiladi), HAM klient komponenti
 * (`components/QuestionActions.tsx`) ishlatadi. Klient servisni import
 * qila olmaydi — u bilan birga butun Prisma klienti brauzer paketiga
 * tushib ketardi.
 */
export const REPORT_REASON_MAX_LENGTH = 300;
