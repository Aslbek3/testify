import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";

/**
 * Rejim boshlash sahifalarining (Mashq / Maraton / Imtihon) umumiy qobig'i.
 *
 * Uchala sahifada bir xil tuzilish bor: sarlavha, qoidalar ro'yxati, xato
 * xabari va boshlash tugmasi. Uchta joyda takrorlansa, biri o'zgartirilib
 * ikkitasi unutilganda sahifalar bir-biriga o'xshamay qolardi.
 */
export function ModeStartCard({
  title,
  description,
  rules,
  error,
  children,
  action,
}: {
  title: string;
  description: string;
  /** Rejim qoidalari — "20 savol", "25 daqiqa" kabi qisqa bandlar. */
  rules: string[];
  /** Test boshlab bo'lmaganda ko'rsatiladigan xabar (masalan savollar yetarli emas). */
  error?: string;
  /** Qo'shimcha boshqaruv (maratonda — savollar sonini tanlash). */
  children?: ReactNode;
  /** Boshlash tugmasi: yo tayyor havola, yo o'zining komponenti. */
  action: { href: string; label: string } | ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      {error && (
        <p className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Qoidalar</CardTitle>
        </CardHeader>

        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-2.5 text-sm text-text">
              <span aria-hidden="true" className="text-text-muted">
                ·
              </span>
              {rule}
            </li>
          ))}
        </ul>

        {children && <div className="mt-6">{children}</div>}

        <div className="mt-6">
          {action && typeof action === "object" && "href" in action ? (
            <Link href={action.href} className="inline-block">
              <Button type="button">{action.label}</Button>
            </Link>
          ) : (
            action
          )}
        </div>
      </Card>
    </div>
  );
}
