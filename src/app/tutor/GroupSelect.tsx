"use client";

import { useRouter } from "next/navigation";
import { SelectField } from "@/components/Field";
import type { TutorGroup } from "@/services/tutorDashboard";

export function GroupSelect({
  groups,
  selectedId,
}: {
  groups: TutorGroup[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <SelectField
      id="group"
      label="Guruh"
      value={selectedId}
      onChange={(e) => router.push(`/tutor?group=${e.target.value}`)}
    >
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </SelectField>
  );
}
