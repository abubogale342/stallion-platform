"use client";

import type { DisciplineFamily } from "@/types/discipline";
import type { StallionFormStep } from "@/types/stallion-form";
import StepIdentity from "./steps/identity";
import StepPedigree from "./steps/pedigree";
import StepPerformance from "./steps/performance";
import StepProgeny from "./steps/progeny";
import StepBreeding from "./steps/breeding";
import StepEt from "./steps/et";
import StepHealth from "./steps/health";
import StepOwners from "./steps/owners";
import StepAgent from "./steps/agent";

export function StallionFormStepPanel({
  step,
  disciplineFamilies,
}: {
  step: StallionFormStep;
  disciplineFamilies: DisciplineFamily[];
}) {
  switch (step) {
    case "identity":
      return <StepIdentity disciplineFamilies={disciplineFamilies} />;
    case "pedigree":
      return <StepPedigree />;
    case "performance":
      return <StepPerformance />;
    case "progeny":
      return <StepProgeny />;
    case "breeding":
      return <StepBreeding />;
    case "et":
      return <StepEt />;
    case "health":
      return <StepHealth />;
    case "owners":
      return <StepOwners />;
    case "agent":
      return <StepAgent />;
    default:
      return null;
  }
}
