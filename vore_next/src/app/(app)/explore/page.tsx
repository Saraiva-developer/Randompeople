import { ExploreClient } from "@/features/explore/client";
import { getPublishedProfiles } from "@/features/vore-shell/queries";

export default async function ExplorePage() {
  const profiles = await getPublishedProfiles(24);
  return <ExploreClient profiles={profiles} />;
}
