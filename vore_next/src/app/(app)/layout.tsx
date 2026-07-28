import type { ReactNode } from "react";
import { VoreShell } from "@/components/vore-shell";
import { getCurrentUser } from "@/features/auth/session";
import { VoreRightRail } from "@/features/vore-shell/right-rail";

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <VoreShell rightRail={<VoreRightRail />} isAuthenticated={!!user}>
      {children}
    </VoreShell>
  );
}
