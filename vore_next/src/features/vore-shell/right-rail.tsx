import Link from "next/link";
import {
  getBadgeType,
  getCardDisplayData,
  getTypeLabel,
  scoreLocal
} from "@/features/vore-shell/display";
import { getPublishedProfiles } from "@/features/vore-shell/queries";

export async function VoreRightRail() {
  const publishedProfiles = await getPublishedProfiles(18);

  const typeCounts = publishedProfiles.reduce<Record<string, number>>((acc, profile) => {
    const key = String(profile.type || "service_pro").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.keys(typeCounts)
    .map((key) => ({ key, count: typeCounts[key], label: getTypeLabel(key) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const featured = [...publishedProfiles]
    .sort((a, b) => scoreLocal(b) - scoreLocal(a))
    .slice(0, 5);

  return (
    <>
      <div className="desktop-rail-block">
        <h4>Selecao Vore</h4>
        <div className="desktop-rail-list">
          {featured.map((profile) => {
            const card = getCardDisplayData(profile);
            const badge = getBadgeType(profile);
            const badgeLabel = badge === "promo" ? "Promo" : badge === "novo" ? "Novo" : "";

            return (
              <Link key={profile.id} href={`/profile/${profile.slug}`} className="desktop-rail-profile">
                <span className="desktop-rail-avatar-wrap">
                  {card.avatar ? (
                    <img src={card.avatar} alt={profile.name} className="desktop-rail-avatar" />
                  ) : (
                    <span className="desktop-rail-avatar placeholder">
                      {profile.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {card.verified ? (
                    <span className="desktop-rail-avatar-verif">{"\u2713"}</span>
                  ) : null}
                </span>
                <span className="desktop-rail-main">
                  <strong>{profile.name}</strong>
                  <span className="desktop-rail-sub">{card.category}</span>
                </span>
                {!card.verified && badgeLabel ? (
                  <span className={`desktop-rail-badge desktop-rail-badge-${badge}`}>
                    {badgeLabel}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="desktop-rail-block">
        <h4>Categorias</h4>
        <div className="desktop-rail-chips">
          {topTypes.map((entry) => (
            <span key={entry.key} className="desktop-rail-chip">
              {entry.label} ({entry.count})
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
