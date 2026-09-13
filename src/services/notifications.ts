import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Oddiy klient yoki tranzaksiya. Bildirishnoma hodisaning O'ZI bilan bitta
 * tranzaksiyada yoziladi: to'lov tasdiqlanib, xabar yozilmay qolishi (yoki
 * aksincha — xabar ketib, to'lov yozilmay qolishi) mumkin bo'lmasin.
 */
type Db = Prisma.TransactionClient | typeof prisma;

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotifications(db: Db, items: NewNotification[]): Promise<void> {
  if (items.length === 0) return;
  await db.notification.createMany({
    data: items.map((item) => ({
      userId: item.userId,
      type: item.type,
      title: item.title,
      body: item.body ?? null,
      link: item.link ?? null,
    })),
  });
}

/** Menyudagi son. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/**
 * Sahifada ko'rsatiladigan eng ko'p son. Eskilari o'chirilmaydi, shunchaki
 * ko'rinmaydi — bildirishnoma hodisaning o'zi emas, faqat u haqidagi xabar;
 * hodisaning o'zi (to'lov, vazifa) o'z bo'limida to'liq tarixi bilan turadi.
 */
export const NOTIFICATIONS_PAGE_SIZE = 50;

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date;
  isRead: boolean;
};

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_PAGE_SIZE,
    select: { id: true, type: true, title: true, body: true, link: true, createdAt: true, readAt: true },
  });
  return rows.map(({ readAt, ...rest }) => ({ ...rest, isRead: readAt !== null }));
}

/**
 * Foydalanuvchining barcha o'qilmaganlarini o'qilgan qiladi. `userId`
 * faqat sessiyadan keladi — shu sabab boshqa birovning bildirishnomasiga
 * tegib bo'lmaydi.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}
