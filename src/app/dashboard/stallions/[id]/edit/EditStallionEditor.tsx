"use client";

import StallionFormWizard from "@/components/admin/stallions/StallionFormWizard";
import type { DisciplineFamily } from "@/types/discipline";
import type { StallionFormValues } from "@/types/stallion-form";

export default function EditStallionEditor({
  defaultValues,
  disciplineFamilies,
}: {
  defaultValues: StallionFormValues;
  disciplineFamilies: DisciplineFamily[];
}) {
  return (
    <StallionFormWizard
      mode="edit"
      defaultValues={defaultValues}
      disciplineFamilies={disciplineFamilies}
    />
  );
}
