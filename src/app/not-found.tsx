import Link from "next/link";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-bg p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold text-text">404 — Sahifa topilmadi</h1>
          <p className="mt-1 text-sm text-text-muted">
            Siz qidirgan sahifa mavjud emas yoki ko&apos;chirilgan.
          </p>
        </div>

        <Link href="/">
          <Button className="w-full">Bosh sahifaga qaytish</Button>
        </Link>
      </div>
    </main>
  );
}
