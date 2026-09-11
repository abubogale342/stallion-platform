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
import { fetchStallionOwnerFormLinks } from "@/services/owner";
import type { FormOwnerLink } from "@/types/stallion-form";

type OwnersStepContextValue = {
  stallionId: string;
  links: FormOwnerLink[];
  setLinks: React.Dispatch<React.SetStateAction<FormOwnerLink[]>>;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
};

const OwnersStepContext = createContext<OwnersStepContextValue | null>(null);

export function OwnersStepProvider({
  stallionId,
  children,
}: {
  stallionId: string;
  children: ReactNode;
}) {
  const [links, setLinks] = useState<FormOwnerLink[]>([]);
  const [loading, setLoading] = useState(() => Boolean(stallionId.trim()));
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const id = stallionId.trim();
    if (!id) {
      setLinks([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const result = await fetchStallionOwnerFormLinks(id);
    if (!result.ok) {
      setLoadError(result.error);
      setLinks([]);
    } else {
      setLinks(result.links);
    }
    setLoading(false);
  }, [stallionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      stallionId: stallionId.trim(),
      links,
      setLinks,
      loading,
      loadError,
      reload,
    }),
    [stallionId, links, loading, loadError, reload]
  );

  return (
    <OwnersStepContext.Provider value={value}>
      {children}
    </OwnersStepContext.Provider>
  );
}

export function useOwnersStep() {
  const context = useContext(OwnersStepContext);
  if (!context) {
    throw new Error("useOwnersStep must be used within OwnersStepProvider");
  }
  return context;
}
