import { HomeClient } from "@/features/home/client";
import { getPublishedProfiles } from "@/features/vore-shell/queries";

export default async function HomePage() {
  const profiles = await getPublishedProfiles(24);
  return <HomeClient profiles={profiles} />;
}
