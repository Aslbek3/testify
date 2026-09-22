"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { WEEKDAY_NAME, WEEKDAY_SHORT } from "@/lib/format";

/**
 * Dars jadvalini tuzish.
 *
 * Takrorlanish qoidasi saqlanmaydi — forma tanlangan kunlar uchun
 * darslarni BIR YO'LA yaratadi (`services/lessons.ts`). Shuning uchun
 * bu yerda "necha hafta" so'raladi: u qancha yozuv yaratilishini
 * belgilaydi va oldindan ko'rsatiladi.
 *
 * Chegaralar serverda ham tekshiriladi; bu yerdagi hisob faqat
 * foydalanuvchiga nima bo'lishini oldindan aytish uchun.
 */
export function LessonScheduleModal({
  groupId,
  groupName,
  topics,
  hasUpcoming,
}: {
  groupId: string;
  groupName: string;
  topics: { id: string; name: string }[];
  /** Guruhda kelajakdagi darslar bormi — "qayta tuzish" ogohlantirishi uchun. */
  hasUpcoming: boolean;
}) {
  const { run, pending, error } = useServerMutation();
  const [open, setOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3]);
  const [time, setTime] = useState("14:00");
  const [durationMin, setDurationMin] = useState(90);
  const [weeks, setWeeks] = useState(8);
  const [topicId, setTopicId] = useState("");
  const [note, setNote] = useState("");
  const [replaceUpcoming, setReplaceUpcoming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const lessonCount = weekdays.length * weeks;

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    );
  }

  function close() {
    setOpen(false);
    setLocalError(null);
    setReplaceUpcoming(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (weekdays.length === 0) {
      setLocalError("Kamida bitta kun tanlang");
      return;
    }
    const [hourText, minuteText] = time.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      setLocalError("Vaqtni to'g'ri kiriting");
      return;
    }

    const ok = await run(() =>
      fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          weekdays,
          hour,
          minute,
          durationMin,
          weeks,
          topicId: topicId || null,
          note: note.trim() || null,
          replaceUpcoming,
        }),
      })
    );
    if (ok) close();
  }

  return (
    <>
      <Button type="button" variant="secondary" icon="calendar" onClick={() => setOpen(true)}>
        Jadval tuzish
      </Button>

      {open && (
        <Modal
          open
          onClose={close}
          title="Dars jadvali"
          description={`${groupName} uchun. Tanlangan kunlarga darslar bir yo'la qo'shiladi.`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || localError) && (
              <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
                <Icon name="alertTriangle" className="mt-0.5 h-4 w-4" />
                {localError ?? error}
              </p>
            )}

            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-text">Hafta kunlari</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_SHORT.map((short, index) => {
                  const day = index + 1;
                  const active = weekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={active}
                      aria-label={WEEKDAY_NAME[index]}
                      onClick={() => toggleWeekday(day)}
                      className={cn(
                        "h-11 w-11 rounded-full border text-[13px] font-bold transition-colors pointer-fine:h-10 pointer-fine:w-10",
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-border bg-bg text-text-muted hover:bg-surface-2 hover:text-text"
                      )}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="lesson-time"
                label="Boshlanish vaqti"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <SelectField
                id="lesson-duration"
                label="Davomiyligi"
                value={String(durationMin)}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                <option value="45">45 daqiqa</option>
                <option value="60">1 soat</option>
                <option value="90">1 soat 30 daqiqa</option>
                <option value="120">2 soat</option>
                <option value="180">3 soat</option>
              </SelectField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                id="lesson-weeks"
                label="Necha hafta"
                value={String(weeks)}
                onChange={(e) => setWeeks(Number(e.target.value))}
              >
                {[2, 4, 8, 12, 16, 24].map((value) => (
                  <option key={value} value={value}>
                    {value} hafta
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="lesson-topic"
                label="Mavzu"
                hint="Ixtiyoriy"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                <option value="">Tanlanmagan</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <Field
              id="lesson-note"
              label="Izoh"
              hint="Masalan: amaliyot, o'quv markazida"
              maxLength={120}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {/* Hisob oldindan ko'rsatiladi: "8 hafta" degani nechta dars
                ekanini foydalanuvchi o'zi hisoblamasin. */}
            <p className="flex items-center gap-2 rounded-md bg-brand-soft px-3.5 py-3 text-[13px] text-text">
              <Icon name="calendar" className="h-4 w-4 text-brand" />
              {weekdays.length === 0 ? (
                "Kun tanlanmagan"
              ) : (
                <>
                  <span className="font-semibold">{lessonCount} ta dars</span>
                  qo&apos;shiladi — haftasiga {weekdays.length} ta, {weeks} hafta
                  davomida
                </>
              )}
            </p>

            {hasUpcoming && (
              // Ikki marta tuzilsa darslar ikki nusxa bo'lib qoladi —
              // server buni tekshirmaydi (izohi `createLessonSeries` da),
              // shuning uchun tanlov aniq beriladi.
              <label className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning-soft px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={replaceUpcoming}
                  onChange={(e) => setReplaceUpcoming(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--warning)]"
                />
                <span className="text-[13px] leading-relaxed text-text">
                  <span className="font-semibold">Eski jadvalni almashtirish</span>
                  <span className="block text-text-muted">
                    Guruhda kelajakdagi darslar bor. Belgilamasangiz, yangilari
                    ularning ustiga qo&apos;shiladi.
                  </span>
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={close}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={pending || weekdays.length === 0}>
                {pending ? "Qo'shilmoqda..." : "Jadvalni tuzish"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
