import type { UseFormReturn } from "react-hook-form";
import type { StallionFormStep, StallionFormValues } from "@/types/stallion-form";

/** Wizard steps that persist all data on the fly (no draft RPC on Next/Save). */
export const ON_THE_FLY_FORM_STEPS: ReadonlySet<StallionFormStep> = new Set([
  "pedigree",
  "owners",
  // Agent review saves its own drafts through `updateAgentDrafts`; its fields
  // are not part of StallionFormValues, so the wizard has nothing to persist
  // for it and must not fire a profile draft write on leaving the step.
  "agent",
]);

const STEP_DRAFT_FIELDS: Record<StallionFormStep, (keyof StallionFormValues)[]> = {
  identity: ["stallion_name"],
  pedigree: [],
  performance: ["stallion_name"],
  progeny: ["stallion_name"],
  breeding: ["stallion_name"],
  et: ["stallion_name"],
  health: ["stallion_name"],
  owners: [],
  agent: [],
};

export async function validateStepForDraft(
  form: UseFormReturn<StallionFormValues>,
  step: StallionFormStep
): Promise<boolean> {
  const fields = STEP_DRAFT_FIELDS[step];
  if (fields.length === 0) return true;
  return form.trigger(fields);
}
