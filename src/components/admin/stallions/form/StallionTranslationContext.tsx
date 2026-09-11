"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { saveStallionProfileTranslationAction } from "@/app/dashboard/stallions/actions";
import type { StallionFormValues } from "@/types/stallion-form";
import type { StallionProfileTranslationFormValues } from "@/types/stallion-translations";
import type { TranslationIdentityFieldKey } from "@/types/stallion-translations";
import { normalizeBreedingMethodLabels } from "@/utils/semen-availability-i18n";

export type TranslationTextFieldKey =
  | "summary"
  | "performance_summary"
  | "breeding_summary";

const EMPTY_FORM: StallionProfileTranslationFormValues = {
  locale: "pt-BR",
  summary: "",
  performance_summary: "",
  breeding_summary: "",
  coat_colour: "",
  breed_label: "",
  discipline_coverage: "",
  breeding_method_labels: {},
  publish_status: "draft",
};

const DEBOUNCE_MS = 800;

type StallionTranslationContextValue = {
  loading: boolean;
  dirty: boolean;
  canEditTranslation: boolean;
  values: StallionProfileTranslationFormValues;
  updateField: (key: TranslationTextFieldKey, value: string) => void;
  updateIdentityField: (key: TranslationIdentityFieldKey, value: string) => void;
  updateBreedingMethodLabel: (method: string, value: string) => void;
  saveTranslationIfDirty: () => Promise<boolean>;
  reloadTranslation: () => Promise<void>;
};

const StallionTranslationContext =
  createContext<StallionTranslationContextValue | null>(null);

export function useStallionTranslation(): StallionTranslationContextValue {
  const ctx = useContext(StallionTranslationContext);
  if (!ctx) {
    throw new Error(
      "useStallionTranslation must be used within StallionTranslationProvider"
    );
  }
  return ctx;
}

export function StallionTranslationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const form = useFormContext<StallionFormValues>();
  const stallionId = form.watch("id")?.trim() ?? "";

  const [values, setValues] =
    useState<StallionProfileTranslationFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const stallionIdRef = useRef(stallionId);
  stallionIdRef.current = stallionId;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTranslation = useCallback(async (id: string) => {
    if (!id) {
      setValues(EMPTY_FORM);
      setDirty(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stallion-profile-translations?stallionId=${encodeURIComponent(id)}&locale=pt-BR`
      );
      if (!res.ok) {
        setValues(EMPTY_FORM);
        setDirty(false);
        return;
      }
      const data =
        (await res.json()) as StallionProfileTranslationFormValues | null;
      setValues(
        data
          ? {
              locale: "pt-BR",
              summary: data.summary ?? "",
              performance_summary: data.performance_summary ?? "",
              breeding_summary: data.breeding_summary ?? "",
              coat_colour: data.coat_colour ?? "",
              breed_label: data.breed_label ?? "",
              discipline_coverage: data.discipline_coverage ?? "",
              breeding_method_labels: normalizeBreedingMethodLabels(
                data.breeding_method_labels
              ),
              publish_status: data.publish_status ?? "draft",
            }
          : EMPTY_FORM
      );
      setDirty(false);
    } catch {
      setValues(EMPTY_FORM);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadTranslation = useCallback(async () => {
    await loadTranslation(stallionIdRef.current);
  }, [loadTranslation]);

  useEffect(() => {
    void loadTranslation(stallionId);
  }, [stallionId, loadTranslation]);

  const saveTranslation = useCallback(async (): Promise<boolean> => {
    const id = stallionIdRef.current;
    if (!id) return true;

    const result = await saveStallionProfileTranslationAction(
      id,
      valuesRef.current
    );
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }

    setValues({
      locale: "pt-BR",
      summary: result.row.summary ?? "",
      performance_summary: result.row.performance_summary ?? "",
      breeding_summary: result.row.breeding_summary ?? "",
      coat_colour: result.row.coat_colour ?? "",
      breed_label: result.row.breed_label ?? "",
      discipline_coverage: result.row.discipline_coverage ?? "",
      breeding_method_labels: result.row.breeding_method_labels ?? {},
      publish_status: result.row.publish_status,
    });
    setDirty(false);
    return true;
  }, []);

  const saveTranslationIfDirty = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current || !stallionIdRef.current) return true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return saveTranslation();
  }, [saveTranslation]);

  useEffect(() => {
    if (!dirty || !stallionId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void saveTranslation();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [dirty, stallionId, values, saveTranslation]);

  const updateField = useCallback(
    (key: TranslationTextFieldKey, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    []
  );

  const updateIdentityField = useCallback(
    (key: TranslationIdentityFieldKey, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    []
  );

  const updateBreedingMethodLabel = useCallback((method: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev.breeding_method_labels };
      const trimmed = value.trim();
      if (trimmed) next[method] = trimmed;
      else delete next[method];
      return { ...prev, breeding_method_labels: next };
    });
    setDirty(true);
  }, []);

  return (
    <StallionTranslationContext.Provider
      value={{
        loading,
        dirty,
        canEditTranslation: Boolean(stallionId),
        values,
        updateField,
        updateIdentityField,
        updateBreedingMethodLabel,
        saveTranslationIfDirty,
        reloadTranslation,
      }}
    >
      {children}
    </StallionTranslationContext.Provider>
  );
}
