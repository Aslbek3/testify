"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";

/**
 * O'quvchi qo'shish — direktor, qabulxona va ustoz uchun BITTA modal.
 *
 * Ilgari uch panelda uchta bir xil nusxa bo'lishi kerak edi (ikkitasi
 * allaqachon bor edi va ular endpoint bilan farq qilardi). Endi
 * endpoint ham bitta (`/api/students`), kim qaysi guruhga qo'sha
 * olishini esa server hal qiladi — bu yerda faqat forma.
 */
export function NewStudentModal({
  groups,
  variant = "primary",
}: {
  groups: { id: string; name: string }[];
  /**
   * Tugma ko'rinishi. Sahifaning ASOSIY amali bo'lsa "primary"
   * (o'quvchilar ro'yxati), yonidagi qo'shimcha amal bo'lsa
   * "secondary" (ustoz paneli — u yerda asosiy ish vazifa berish).
   */
  variant?: "primary" | "secondary";
}) {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, groupId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setSuccess(`O'quvchi qo'shildi: ${email}`);
    setName("");
    setEmail("");
    setPassword("");
    await refresh();
  }

  // Guruhsiz o'quvchi bo'lmaydi. Asosiy amal bo'lsa tugma o'chiq holda
  // sababi bilan ko'rsatiladi (aks holda foydalanuvchi uni qidiradi),
  // qo'shimcha amal bo'lsa umuman chizilmaydi.
  if (groups.length === 0) {
    if (variant === "secondary") return null;
    return (
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled>
          + Yangi o&apos;quvchi
        </Button>
        <span className="text-sm text-text-muted">Avval guruh yarating</span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant === "primary" ? "primary" : "secondary"}
        onClick={() => setOpen(true)}
      >
        + Yangi o&apos;quvchi
      </Button>

      <Modal open={open} onClose={close} title="Yangi o'quvchi qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              {success}
            </p>
          )}

          {/* Bitta guruh bo'lsa tanlash ma'nosiz — lekin qiymat baribir
              yuboriladi (`groupId` boshlang'ich holatda birinchi guruh). */}
          {groups.length > 1 && (
            <SelectField
              id="new-student-group"
              label="Guruh"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </SelectField>
          )}
          <Field
            id="new-student-name"
            label="To'liq ismi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="new-student-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            id="new-student-password"
            label="Vaqtinchalik parol"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Yopish
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
