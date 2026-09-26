import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { cn } from "@/lib/cn";

/**
 * Rejim boshlash sahifalarining (Mashq / Maraton / Imtihon) umumiy qobig'i.
 *
 * Uchala sahifada bir xil tuzilish bor: sarlavha, qoidalar ro'yxati, xato
 * xabari va boshlash tugmasi. Uchta joyda takrorlansa, biri o'zgartirilib
 * ikkitasi unutilganda sahifalar bir-biriga o'xshamay qolardi.
 *
 * Qoidalar ATAYLAB boshlashdan OLDIN ko'rsatiladi: o'quvchi imtihonga
 * kirib, vaqt borligini o'rtada bilib qolmasligi kerak. Shu sababdan
 * asosiy uchta qoida (savol soni, vaqt, izoh) yuqorida plitka sifatida
 * ham turadi — ular butun matnni o'qimasdan ham ko'rinadi.
 */
export function ModeStartCard({
  icon,
  tone,
  title,
  description,
  highlights,
  rules,
  error,
  children,
  action,
}: {
  /** Rejim ikonkasi — o'quvchi panelidagi kartochka bilan AYNI belgi. */
  icon: IconName;
  /** Ikonka doirasining rangi — o'sha kartochka bilan bir xil. */
  tone: string;
  title: string;
  description: string;
  /**
   * Eng muhim uchta fakt: savol soni, vaqt, izoh bor-yo'qligi. Qoidalar
   * ro'yxatidan ALOHIDA, chunki aynan shular qaror uchun kerak.
   */
  highlights: { icon: IconName; label: string; value: string }[];
  /** Rejim qoidalari — to'liq ro'yxat. */
  rules: string[];
  /** Test boshlab bo'lmaganda ko'rsatiladigan xabar (masalan savollar yetarli emas). */
  error?: string;
  /** Qo'shimcha boshqaruv (maratonda — savollar sonini tanlash). */
  children?: ReactNode;
  /** Boshlash tugmasi: yo tayyor havola, yo o'zining komponenti. */
  action: { href: string; label: string } | ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            tone
          )}
        >
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <PageHeader title={title} description={description} className="flex-1" />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4" />
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border bg-bg px-3.5 py-3 shadow-card"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
              <Icon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </p>
            <p className="mt-1 font-display text-[17px] font-bold text-text">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <p className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-text">
          <Icon name="shield" className="h-[18px] w-[18px] text-text-faint" />
          Qoidalar
        </p>

        <ul className="space-y-2.5">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-2.5 text-[13px] leading-relaxed text-text">
              <Icon
                name="check"
                className="mt-0.5 h-4 w-4 shrink-0 text-brand"
              />
              {rule}
            </li>
          ))}
        </ul>

        {children && <div className="mt-6">{children}</div>}

        <div className="mt-6">
          {action && typeof action === "object" && "href" in action ? (
            <Link href={action.href} className="inline-block">
              <Button type="button" size="lg" icon="play">
                {action.label}
              </Button>
            </Link>
          ) : (
            action
          )}
        </div>
      </Card>
    </div>
  );
}
