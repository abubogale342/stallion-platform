"use client";

import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import { OwnersStepProvider } from "./OwnersStepContext";
import OwnersStepEditor from "./OwnersStepEditor";

export default function StepOwners() {
  const stallionId = useFormContext<StallionFormValues>().watch("id")?.trim() ?? "";

  return (
    <OwnersStepProvider stallionId={stallionId}>
      <OwnersStepEditor />
    </OwnersStepProvider>
  );
}
