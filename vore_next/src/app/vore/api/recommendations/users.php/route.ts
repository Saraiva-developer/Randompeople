import { json } from "@/features/legacy-vore/api";
import { requireCommonUser, searchCommonUsers } from "@/features/legacy-vore/recommendations";

export async function GET(request: Request) {
  const session = await requireCommonUser();

  if ("error" in session) {
    return json({ ok: false, error: session.error }, { status: session.status });
  }

  const url = new URL(request.url);
  const users = await searchCommonUsers(url.searchParams.get("q") || "", session.user.id);

  return json({ ok: true, users });
}
