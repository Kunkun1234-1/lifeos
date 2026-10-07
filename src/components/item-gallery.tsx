import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./item-gallery.module.css";

type GalleryRarity = "common" | "good" | "rare" | "epic" | "legendary";

const RARITY: Record<GalleryRarity, { stars: number; color: string }> = {
  common: { stars: 1, color: "#697384" },
  good: { stars: 2, color: "#507e6f" },
  rare: { stars: 3, color: "#497cac" },
  epic: { stars: 4, color: "#79609c" },
  legendary: { stars: 5, color: "#b77d43" },
};

// Reward star levels follow the same tiers as the wish result screen.
export function rewardGalleryRarity(tier: "common" | "rare" | "epic" | "legendary"): GalleryRarity {
  return tier === "legendary" ? "legendary" : tier === "common" ? "rare" : "epic";
}

function rarityStyle(rarity: GalleryRarity): CSSProperties {
  return { "--item-color": RARITY[rarity].color } as CSSProperties;
}

function RarityStars({ rarity }: { rarity: GalleryRarity }) {
  const count = RARITY[rarity].stars;
  return (
    <span className={styles.stars} role="img" aria-label={`${count} 星`}>
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} size={14} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ItemTile({
  name, subtitle, rarity, selected, amount, amountLabel, badge, onClick, children,
}: {
  name: string;
  subtitle?: string;
  rarity: GalleryRarity;
  selected: boolean;
  amount: string;
  amountLabel: string;
  badge?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(styles.card, selected && styles.cardSelected)}
      style={rarityStyle(rarity)}
      aria-label={`${name}，${amountLabel}`}
      aria-pressed={selected}
      title={subtitle ? `${name} · ${subtitle}` : name}
      onClick={onClick}
    >
      {badge ? <span className={styles.cardBadge}>{badge}</span> : null}
      <span className={styles.cardVisual}>{children}</span>
      <span className={styles.cardStars}><RarityStars rarity={rarity} /></span>
      <span className={styles.valueStrip}>{amount}</span>
    </button>
  );
}

export function ItemDetailHero({ title, subtitle, rarity, action, children }: {
  title: string;
  subtitle: string;
  rarity: GalleryRarity;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.detailHero} style={rarityStyle(rarity)}>
      <div className={styles.detailHeading}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      <div className={styles.detailArtwork}>{children}</div>
      <div className={styles.detailStars}><RarityStars rarity={rarity} /></div>
    </div>
  );
}
