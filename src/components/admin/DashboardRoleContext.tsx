"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  roleCanPublish,
  type AppRole,
} from "@/types/roles";

type DashboardRoleValue = {
  role: AppRole;
  canPublish: boolean;
};

const DashboardRoleContext = createContext<DashboardRoleValue | null>(null);

export function DashboardRoleProvider({
  role,
  children,
}: {
  role: AppRole;
  children: ReactNode;
}) {
  return (
    <DashboardRoleContext.Provider
      value={{ role, canPublish: roleCanPublish(role) }}
    >
      {children}
    </DashboardRoleContext.Provider>
  );
}

export function useDashboardRole(): DashboardRoleValue {
  const ctx = useContext(DashboardRoleContext);
  if (!ctx) {
    throw new Error("useDashboardRole must be used within DashboardRoleProvider");
  }
  return ctx;
}

type StallionPermissionsValue = {
  canEdit: boolean;
  canDeleteChildren: boolean;
};

const StallionPermissionsContext =
  createContext<StallionPermissionsValue | null>(null);

export function StallionPermissionsProvider({
  canEdit,
  canDeleteChildren,
  children,
}: StallionPermissionsValue & { children: ReactNode }) {
  return (
    <StallionPermissionsContext.Provider value={{ canEdit, canDeleteChildren }}>
      {children}
    </StallionPermissionsContext.Provider>
  );
}

export function useStallionPermissions(): StallionPermissionsValue {
  return (
    useContext(StallionPermissionsContext) ?? {
      canEdit: true,
      canDeleteChildren: true,
    }
  );
}
