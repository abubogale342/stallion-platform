"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
  publishStallionAction,
  unpublishStallionAction,
  updatePerformanceStepDraftAction,
  updateStallionDraftAction,
} from "@/app/dashboard/stallions/actions";
import type { DisciplineFamily } from "@/types/discipline";
import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import type { StallionFormStep, StallionFormValues } from "@/types/stallion-form";
import { getFormStepsForHorseType } from "@/types/stallion-form";
import { validateStepForDraft, ON_THE_FLY_FORM_STEPS } from "@/utils/stallion-form-validation";
import { toastPublishValidationFailure } from "@/utils/stallion";
import Button, { buttonClassName } from "@/ui/Button";
import Badge from "@/ui/Badge";
import Modal from "@/ui/Modal";
import { StallionFormStepPanel } from "./form/steps";
import { StallionTranslationProvider, useStallionTranslation } from "./form/StallionTranslationContext";
import { useDashboardRole } from "@/components/admin/DashboardRoleContext";

function PublishStatusBadge({
  status,
}: {
  status: AdminStallionPublishStatus | "";
}) {
  if (!status) return null;
  const isPublished = status === "published";
  return (
    <Badge variant={isPublished ? "success" : "warning"}>
      {isPublished ? "Published" : "Draft"}
    </Badge>
  );
}

function StallionFormWizardContent({
  mode,
  stallionLabel,
  disciplineFamilies,
}: {
  mode: "create" | "edit";
  stallionLabel?: string;
  disciplineFamilies: DisciplineFamily[];
}) {
  const { canPublish } = useDashboardRole();
  const [stepIndex, setStepIndex] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveValidationMessages, setSaveValidationMessages] = useState<
    string[]
  >([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishPending, setPublishPending] = useState(false);

  const form = useFormContext<StallionFormValues>();
  const isFormDirty = form.formState.isDirty;
  const { saveTranslationIfDirty, reloadTranslation, dirty: translationDirty } =
    useStallionTranslation();

  const horseType = form.watch("horse_type");
  const isMare = horseType === "mare";
  const steps = getFormStepsForHorseType(horseType);
  const typeNoun = isMare ? "mare" : "stallion";

  const pageTitle =
    form.watch("stallion_name")?.trim() ||
    stallionLabel ||
    (isMare ? "New donor mare" : "New stallion");

  const publishStatus = form.watch("publish_status");
  const stallionId = form.watch("id")?.trim() ?? "";

  const saveForm = useCallback(async (): Promise<boolean> => {
    const step = steps[stepIndex].id as StallionFormStep;
    const valid = await validateStepForDraft(form, step);
    if (!valid) return false;

    if (mode === "edit") {
      const shouldPersistDraft =
        !ON_THE_FLY_FORM_STEPS.has(step) && isFormDirty;

      if (shouldPersistDraft) {
        const values = form.getValues();
        const result =
          step === "performance"
            ? await updatePerformanceStepDraftAction({
                id: values.id,
                performance_summary: values.performance_summary,
                racing_summary: values.racing_summary,
              })
            : await updateStallionDraftAction(values);
        if (!result.ok) {
          setSaveError(result.error);
          setSaveValidationMessages(result.validationMessages ?? []);
          if (result.field) {
            form.setError(result.field as keyof StallionFormValues, {
              message: result.error,
            });
          }
          return false;
        }

        setSaveError(null);
        setSaveValidationMessages([]);
        setLastSavedAt(new Date());
        if (result.publish_status) {
          form.setValue("publish_status", result.publish_status);
        }
        form.reset(form.getValues());
      }

      const translationSaved = await saveTranslationIfDirty();
      if (!translationSaved) return false;
    }

    if (
      mode === "edit" &&
      !ON_THE_FLY_FORM_STEPS.has(step) &&
      (isFormDirty || translationDirty)
    ) {
      toast.success("Saved");
    }
    return true;
  }, [
    form,
    isFormDirty,
    translationDirty,
    mode,
    stepIndex,
    steps,
    saveTranslationIfDirty,
  ]);

  const currentStep = steps[stepIndex].id;

  const handleSaveClick = () => {
    void (async () => {
      setIsSaving(true);
      try {
        await saveForm();
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleNext = () => {
    void (async () => {
      setIsSaving(true);
      try {
        const ok = await saveForm();
        if (ok) {
          setStepIndex((i) => Math.min(i + 1, steps.length - 1));
        }
      } finally {
        setIsSaving(false);
      }
    })();
  };

  /** Step tabs save the current step before jumping so typed data is never lost. */
  const handleTabClick = (targetIndex: number) => {
    if (targetIndex === stepIndex) return;
    void (async () => {
      setIsSaving(true);
      try {
        const ok = await saveForm();
        if (ok) {
          setStepIndex(targetIndex);
        }
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handlePublishConfirm = () => {
    if (!stallionId) return;
    const isDraft = publishStatus !== "published";
    void (async () => {
      setPublishPending(true);
      try {
        const saved = await saveForm();
        if (!saved) {
          setConfirmPublishOpen(false);
          return;
        }

        const result = isDraft
          ? await publishStallionAction(stallionId)
          : await unpublishStallionAction(stallionId);

        setConfirmPublishOpen(false);

        if (!result.ok) {
          toastPublishValidationFailure(toast, {
            title: isDraft ? "Could not publish" : "Could not unpublish",
            validationMessages: result.validationMessages,
          });
          return;
        }

        form.setValue("publish_status", result.publish_status);
        await reloadTranslation();
        toast.success(isDraft ? "Published" : "Unpublished");
      } finally {
        setPublishPending(false);
      }
    })();
  };

  const isDraft = publishStatus !== "published";
  const publishLabel = isDraft ? "Publish" : "Unpublish";
  const confirmTitle = isDraft
    ? `Publish ${typeNoun}?`
    : `Unpublish ${typeNoun}?`;
  const confirmMessage = isDraft
    ? `Publish “${pageTitle}” on the public directory? Any saved Portuguese overview, performance summary, and breeding notes will go live on /pt-BR at the same time.`
    : `Unpublish “${pageTitle}” and return it to draft? Portuguese narrative content will be hidden as well.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            {mode === "create" ? `Create ${typeNoun}` : `Edit ${typeNoun}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {pageTitle}
            </h1>
            {mode === "edit" ? (
              <PublishStatusBadge status={publishStatus} />
            ) : null}
          </div>
          {mode === "edit" && stallionId ? (
            <p className="mt-1 font-mono text-xs text-slate-500">
              ID: {stallionId}
            </p>
          ) : null}
          {lastSavedAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Last saved {lastSavedAt.toLocaleTimeString()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "edit" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                loading={isSaving}
                disabled={publishPending}
                onClick={handleSaveClick}
                className="border border-slate-600 text-slate-200"
              >
                Save
              </Button>
              {canPublish ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={isSaving || publishPending}
                onClick={() => setConfirmPublishOpen(true)}
                className="border border-slate-600 text-slate-200"
              >
                {publishLabel}
              </Button>
              ) : null}
            </>
          ) : null}
          <Link
            href="/dashboard/stallions"
            className={buttonClassName({
              variant: "ghost",
              size: "md",
              className:
                "border border-slate-700 text-slate-400 hover:text-slate-200",
            })}
          >
            Cancel
          </Link>
        </div>
      </div>

      {saveError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          <p>{saveError}</p>
          {saveValidationMessages.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-red-300/90">
              {saveValidationMessages.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && stallionId ? (
        <p className="rounded-lg border border-sky-900/40 bg-sky-950/20 px-4 py-3 text-sm text-slate-300">
          <span className="font-medium text-sky-200">Portuguese content:</span>{" "}
          use the <span className="text-slate-100">Português (pt-BR)</span> tab
          on Overview, Performance summary, or Breeding notes. It auto-saves as
          draft; <span className="text-slate-100">Publish</span> makes English and
          any saved Portuguese text live together.
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-1 border-b border-slate-800/80 pb-3">
        {steps.map((s, i) => (
          <Button
            key={s.id}
            type="button"
            variant="unstyled"
            size="none"
            onClick={() => handleTabClick(i)}
            disabled={isSaving || publishPending}
            className={
              i === stepIndex
                ? "rounded-md bg-sky-950/50 px-2.5 py-1 text-xs font-medium text-sky-100"
                : "rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
            }
          >
            {i + 1}. {s.label}
          </Button>
        ))}
      </nav>

      <form
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const target = e.target;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
          ) {
            e.preventDefault();
          }
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <StallionFormStepPanel
          step={currentStep as StallionFormStep}
          disciplineFamilies={disciplineFamilies}
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={stepIndex === 0 || isSaving}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="border border-slate-600 text-slate-300"
          >
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={isSaving}
              onClick={handleNext}
              className="border-sky-500/40 bg-sky-950/40 hover:border-sky-500/60"
            >
              {isSaving ? "Saving…" : "Next"}
            </Button>
          ) : null}
        </div>
      </form>

      <Modal
        open={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        title={confirmTitle}
        size="md"
        preventClose={publishPending}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={publishPending}
              onClick={() => setConfirmPublishOpen(false)}
              className="border border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={publishPending}
              onClick={handlePublishConfirm}
            >
              {publishLabel}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">{confirmMessage}</p>
      </Modal>
    </div>
  );
}

export default function StallionFormWizard({
  defaultValues,
  mode,
  stallionLabel,
  disciplineFamilies,
}: {
  defaultValues: StallionFormValues;
  mode: "create" | "edit";
  stallionLabel?: string;
  disciplineFamilies: DisciplineFamily[];
}) {
  const form = useForm<StallionFormValues>({ defaultValues });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <FormProvider {...form}>
      <StallionTranslationProvider>
        <StallionFormWizardContent
          mode={mode}
          stallionLabel={stallionLabel}
          disciplineFamilies={disciplineFamilies}
        />
      </StallionTranslationProvider>
    </FormProvider>
  );
}
