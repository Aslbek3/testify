"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { PLAN_LABEL, ORG_STATUS_LABEL } from "@/lib/labels";
import type { OrganizationWithCounts } from "@/services/organizations";
import type { OrganizationStatus, Plan } from "@prisma/client";

// Ro'yxatlar yorliq jadvallaridan olinadi — enumga yangi tarif/holat
// qo'shilganda `labels.ts` da yorliq yozilishi bilan u shu yerda ham
// o'zi paydo bo'ladi (qo'lda yozilgan <option> ro'yxati unutilib qolardi).
const PLAN_OPTIONS = Object.keys(PLAN_LABEL) as Plan[];
const STATUS_OPTIONS = Object.keys(ORG_STATUS_LABEL) as OrganizationStatus[];

/**
 * Tashkilot qatoridan tahrirlash: nom, shahar, tarif rejasi va holat.
 *
 * Har bir qator o'z modalini render qiladi (`NewOrganizationModal` bilan
 * bir xil uslub) — `Modal` yopiq holatda `null` qaytargani uchun bu
 * jadvalga qo'shimcha yuk bermaydi.
 */
export function EditOrganizationModal({
  organization,
}: {
  organization: OrganizationWithCounts;
}) {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(organization.name);
  const [city, setCity] = useState(organization.city);
  const [plan, setPlan] = useState<Plan>(organization.plan);
  const [status, setStatus] = useState<OrganizationStatus>(organization.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

  // Ogohlantirish faqat holat HOZIR o'zgartirilayotgan bo'lsa chiqadi:
  // allaqachon "Muddati tugagan" tashkilotni tahrirlaganda (masalan
  // shahar nomini tuzatish) "hamma chiqarib yuboriladi" deb qo'rqitish
  // noto'g'ri bo'lardi — ular allaqachon chiqarilgan.
  const willExpire =
    status === "EXPIRED" && organization.status !== "EXPIRED";

  // Bloklanmagan hisoblar — aynan shular sessiyasidan ayriladi.
  // Bloklangan hisoblar bu yerda sanalmaydi, chunki ular baribir
  // tizimga kira olmaydi.
  const affectedUserCount =
    organization.directorCount + organization.tutorCount + organization.studentCount;

  function close() {
    setOpen(false);
    setError(null);
  }

  function openModal() {
    // Modal har ochilganda qatordagi HOZIRGI qiymatlarga qaytariladi —
    // owner o'zgartirib, saqlamasdan yopib, keyin qayta ochsa eski
    // (saqlanmagan) tanlovi qolib ketmasin.
    setName(organization.name);
    setCity(organization.city);
    setPlan(organization.plan);
    setStatus(organization.status);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/organizations/${organization.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city, plan, status }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    await refresh();

    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={openModal}>
        Tahrirlash
      </Button>

      <Modal open={open} onClose={close} title="Tashkilotni tahrirlash">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Field
            id={`edit-org-name-${organization.id}`}
            label="Avtomaktab nomi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id={`edit-org-city-${organization.id}`}
            label="Shahar"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <SelectField
            id={`edit-org-plan-${organization.id}`}
            label="Tarif rejasi"
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan)}
          >
            {PLAN_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {PLAN_LABEL[value]}
              </option>
            ))}
          </SelectField>
          <SelectField
            id={`edit-org-status-${organization.id}`}
            label="Holat"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrganizationStatus)}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {ORG_STATUS_LABEL[value]}
              </option>
            ))}
          </SelectField>

          {/* "Muddati tugagan" — yorliq emas, amal. Owner buni bilib
              turib bosishi kerak, shuning uchun ogohlantirish tugmaning
              yonida va aniq raqam bilan turadi. */}
          {willExpire && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <p className="font-medium">
                Diqqat: &quot;{ORG_STATUS_LABEL.EXPIRED}&quot; holati hisoblarni
                bloklaydi
              </p>
              <p className="mt-1">
                Saqlashingiz bilan bu tashkilotdagi{" "}
                <span className="font-mono font-semibold">{affectedUserCount}</span>{" "}
                ta bloklanmagan hisob ({organization.directorCount} direktor,{" "}
                {organization.tutorCount} ustoz, {organization.studentCount}{" "}
                o&apos;quvchi) darhol tizimdan chiqariladi. Ular paroli
                to&apos;g&apos;ri bo&apos;lsa ham qayta kira olmaydi va
                imtihonni davom ettira olmaydi.
              </p>
              <p className="mt-1">
                Holatni keyin &quot;{ORG_STATUS_LABEL.ACTIVE}&quot; ga
                qaytarsangiz, hammasi yana ishlaydi — ma&apos;lumotlar
                o&apos;chirilmaydi.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
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
