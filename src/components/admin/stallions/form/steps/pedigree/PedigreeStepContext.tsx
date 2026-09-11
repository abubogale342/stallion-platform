"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchStallionPedigreeFormRows } from "@/services/pedigree";
import type { FormPedigreeRow } from "@/types/stallion-form";

type PedigreeStepContextValue = {
  stallionId: string;
  rows: FormPedigreeRow[];
  setRows: React.Dispatch<React.SetStateAction<FormPedigreeRow[]>>;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
};

const PedigreeStepContext = createContext<PedigreeStepContextValue | null>(
  null
);

export function PedigreeStepProvider({
  stallionId,
  children,
}: {
  stallionId: string;
  children: ReactNode;
}) {
  const [rows, setRows] = useState<FormPedigreeRow[]>([]);
  const [loading, setLoading] = useState(() => Boolean(stallionId.trim()));
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const id = stallionId.trim();
    if (!id) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const result = await fetchStallionPedigreeFormRows(id);
    if (!result.ok) {
      setLoadError(result.error);
      setRows([]);
    } else {
      setRows(result.rows);
    }
    setLoading(false);
  }, [stallionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      stallionId: stallionId.trim(),
      rows,
      setRows,
      loading,
      loadError,
      reload,
    }),
    [stallionId, rows, loading, loadError, reload]
  );

  return (
    <PedigreeStepContext.Provider value={value}>
      {children}
    </PedigreeStepContext.Provider>
  );
}

export function usePedigreeStep() {
  const context = useContext(PedigreeStepContext);
  if (!context) {
    throw new Error("usePedigreeStep must be used within PedigreeStepProvider");
  }
  return context;
}
