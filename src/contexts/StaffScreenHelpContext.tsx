import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type StaffScreenHelpContent = {
  title?: string;
  purpose: string;
  whenToUse?: string;
  steps?: Array<string | { title: string; detail?: string }>;
  howToConfirm?: string;
  assistantQuestion?: string;
  children?: ReactNode;
};

type Ctx = {
  help: StaffScreenHelpContent | null;
  setHelp: (help: StaffScreenHelpContent | null) => void;
};

const StaffScreenHelpContext = createContext<Ctx | null>(null);

export function StaffScreenHelpProvider({ children }: { children: ReactNode }) {
  const [help, setHelp] = useState<StaffScreenHelpContent | null>(null);
  const value = useMemo(() => ({ help, setHelp }), [help]);
  return <StaffScreenHelpContext.Provider value={value}>{children}</StaffScreenHelpContext.Provider>;
}

export function useStaffScreenHelp() {
  const ctx = useContext(StaffScreenHelpContext);
  if (!ctx) {
    throw new Error("useStaffScreenHelp must be used within StaffScreenHelpProvider");
  }
  return ctx;
}
