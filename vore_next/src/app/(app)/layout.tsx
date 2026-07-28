import type { ReactNode } from "react";
import { VoreShell } from "@/components/vore-shell";
import { getCurrentAccount } from "@/features/vore-shell/queries";
import { VoreRightRail } from "@/features/vore-shell/right-rail";

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const account = await getCurrentAccount();
  const accountType = !account ? "guest" : account.account_type === "common" ? "common" : "professional";

  return (
    <VoreShell rightRail={<VoreRightRail />} accountType={accountType}>
      {children}
    </VoreShell>
  );
}
