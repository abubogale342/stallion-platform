"use client";

import { createContext, useContext } from "react";

type ResearchImagesRefreshContextValue = {
  refresh: () => void;
};

export const ResearchImagesRefreshContext =
  createContext<ResearchImagesRefreshContextValue | null>(null);

export function useResearchImagesRefresh() {
  return useContext(ResearchImagesRefreshContext);
}
