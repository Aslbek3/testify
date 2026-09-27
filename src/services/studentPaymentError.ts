/**
 * O'quvchi to'lovi bilan bog'liq domen xatolari.
 *
 * Alohida faylda, chunki uni to'lovning uchala qismi ham ishlatadi:
 * sozlamalar, kirish holati va to'lovning o'zi. Bittasining ichida
 * tursa, fayllar bir-birini aylanma import qilib qolardi
 * (`attemptError.ts` bilan bir xil sabab).
 */
export class StudentPaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
