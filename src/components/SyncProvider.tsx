"use client";

import { useAutoSync } from "@/hooks/useAutoSync";

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  useAutoSync();
  return <>{children}</>;
}
