"use client";

import { useEffect } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { logError } from "@/lib/logger";

/**
 * Shu bo'limdagi sahifa yiqilganda ko'rsatiladigan ekran.
 *
 * Ilgari bu bo'limda `error.tsx` yo'q edi: xato yuqoriga, ildiz
 * darajasigacha ko'tarilib, foydalanuvchiga Next.js ning xom ekrani
 * chiqardi — brendsiz, o'zbekchasiz va "qayta urinish" tugmasisiz.
 *
 * Xato PM2 logiga ham yoziladi (`lib/logger.ts`), aks holda server
 * tomonda hech qanday iz qolmasdi.
 */
export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { path: window.location.pathname });
  }, [error]);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-text">
        Ma&apos;lumotni yuklab bo&apos;lmadi
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Server bilan bog&apos;lanishda xatolik yuz berdi. Qayta urinib
        ko&apos;ring.
      </p>
      <Button type="button" onClick={() => reset()} className="mt-4">
        Qayta urinish
      </Button>
    </Card>
  );
}
