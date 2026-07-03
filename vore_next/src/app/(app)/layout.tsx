import type { ReactNode } from "react";
import { VoreShell } from "@/components/vore-shell";
import { VoreRightRail } from "@/features/vore-shell/right-rail";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return <VoreShell rightRail={<VoreRightRail />}>{children}</VoreShell>;
}
