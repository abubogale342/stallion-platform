"use client";

import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import { PedigreeStepProvider } from "./PedigreeStepContext";
import PedigreeStepEditor from "./PedigreeStepEditor";

export default function StepPedigree() {
  const stallionId = useFormContext<StallionFormValues>().watch("id")?.trim() ?? "";

  return (
    <PedigreeStepProvider stallionId={stallionId}>
      <PedigreeStepEditor />
    </PedigreeStepProvider>
  );
}
