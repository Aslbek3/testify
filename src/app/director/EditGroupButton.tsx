"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { GroupFormModal, type GroupFormValues } from "./GroupFormModal";

/**
 * Guruh sahifasidagi "Tahrirlash" tugmasi — jadvaldagi bilan AYNI
 * formani (`GroupFormModal`) ochadi, faqat tugmasi boshqa joyda turadi.
 */
export function EditGroupButton({
  group,
  tutors,
  nameMaxLength,
}: {
  group: GroupFormValues;
  tutors: { id: string; name: string }[];
  nameMaxLength: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Tahrirlash
      </Button>

      {open && (
        <GroupFormModal
          tutors={tutors}
          nameMaxLength={nameMaxLength}
          group={group}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
