"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";

export type GroupFormValues = {
  groupId: string;
  groupName: string;
  tutorId: string;
};

/**
 * Guruh yaratish va tahrirlash uchun BITTA modal — ikkala holatda ham
 * aynan bir xil ikkita maydon (nom va ustoz) so'raladi, faqat so'rov
 * manzili farq qiladi. Ikki nusxada saqlansa, biriga qo'yilgan tekshiruv
 * (masalan nom uzunligi) ikkinchisida unutilib qolardi.
 *
 * Komponent chaqiruvchi tomonidan SHARTLI render qilinadi (`{open && ...}`)
 * — shunda har ochilishda forma holati yangidan quriladi va oldingi
 * guruhning nomi keyingisiga o'tib qolmaydi.
 */
export function GroupFormModal({
  tutors,
  nameMaxLength,
  group,
  onClose,
}: {
  tutors: { id: string; name: string }[];
  /** Servisdagi `GROUP_NAME_MAX_LENGTH` — sahifadan prop orqali keladi,
      chunki servis fayli Prisma'ni import qiladi va klient bundle'iga
      tushmasligi kerak. */
  nameMaxLength: number;
  /** Berilsa — tahrirlash rejimi; berilmasa — yangi guruh. */
  group?: GroupFormValues;
  onClose: () => void;
}) {
  const isEdit = group !== undefined;
  const [name, setName] = useState(group?.groupName ?? "");
  const [tutorId, setTutorId] = useState(group?.tutorId ?? tutors[0]?.id ?? "");
  const { run, pending, error } = useServerMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Modal YANGILANISH TUGAGACH yopiladi. Ilgari u darhol yopilardi va
    // direktor paneli 2-4 soniya eski ma'lumot bilan turardi — tashqaridan
    // bu "saqladim, hech narsa o'zgarmadi" ko'rinishida edi.
    const ok = await run(() =>
      fetch(isEdit ? `/api/groups/${group.groupId}` : "/api/groups", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tutorId }),
      })
    );
    if (ok) onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Guruhni tahrirlash" : "Yangi guruh qo'shish"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Field
          id="group-name"
          label="Guruh nomi"
          required
          maxLength={nameMaxLength}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SelectField
          id="group-tutor"
          label="Ustoz"
          value={tutorId}
          onChange={(e) => setTutorId(e.target.value)}
        >
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>

        {/* Ustoz almashtirilganda guruhdagi eski natijalar guruh bilan
            birga yangi ustozga o'tadi — direktor buni oldindan bilishi
            kerak, aks holda ustozlar reytingidagi o'zgarish kutilmagan
            bo'lib tuyuladi. */}
        {isEdit && (
          <p className="text-sm text-text-muted">
            Ustoz almashtirilsa, guruhdagi barcha natijalar guruh bilan
            birga yangi ustozning reytingiga o&apos;tadi.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
