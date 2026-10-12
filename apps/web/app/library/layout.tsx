import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Finding Astro Library — Free Animal-Welfare Reading",
    template: "%s | Finding Astro Library",
  },
  description:
    "Discover free, practical guides to animal welfare, street-dog and cat care, rescue, first aid, adoption, and compassionate community action from Finding Astro.",
  keywords: [
    "animal welfare",
    "street dog care",
    "community cat care",
    "animal rescue",
    "animal first aid",
    "adoption guides",
    "Finding Astro",
  ],
  openGraph: {
    type: "website",
    siteName: "Finding Astro",
    title: "Finding Astro Library — Knowledge that helps animals",
    description:
      "Free, practical animal-welfare publications for rescuers, caregivers, volunteers, and compassionate communities.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Finding Astro Library",
    description:
      "Free, practical animal-welfare reading for rescuers, caregivers, and communities.",
  },
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return children;
}
