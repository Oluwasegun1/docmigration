export interface PrimaryNavItem {
  title: string;
  href: string;
  description?: string;
}

export const primaryNav: PrimaryNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    description: "Status summary and next step",
  },
  {
    title: "Matches",
    href: "/matches",
    description: "Review your ranked pathway matches",
  },
  {
    title: "Pathways",
    href: "/explore",
    description: "Browse destinations and pathways",
  },
  {
    title: "Plan",
    href: "/plan",
    description: "Your personalized step-by-step migration plan",
  },
];
