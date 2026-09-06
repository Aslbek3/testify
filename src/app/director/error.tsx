"use client";

import { useEffect } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { logError } from "@/lib/logger";

export default function DirectorError({
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
      <h2 className="text-lg font-semibold text-text">Ma&apos;lumotni yuklab bo&apos;lmadi</h2>
      <p className="mt-2 text-sm text-text-muted">
        Server bilan bog&apos;lanishda xatolik yuz berdi. Qayta urinib ko&apos;ring.
      </p>
      <Button type="button" onClick={() => reset()} className="mt-4">
        Qayta urinish
      </Button>
    </Card>
  );
}
