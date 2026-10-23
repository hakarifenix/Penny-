import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  GraduationCap,
  HeartPulse,
  Clapperboard,
  Sparkles,
  Users,
  Shapes,
  Briefcase,
  Laptop,
  Building2,
  Gift,
  PiggyBank,
  Coins,
  Home,
  Plane,
  Shirt,
  Smartphone,
  BookOpen,
  Dumbbell,
  Baby,
  Wrench,
  MoreHorizontal,
} from "lucide-react";

/**
 * Registry of allowed icon keys. The database stores only the string key,
 * never a component reference, so the DB stays serializable for backups.
 */
export const ICONS: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Car,
  shopping: ShoppingBag,
  bills: Receipt,
  education: GraduationCap,
  health: HeartPulse,
  entertainment: Clapperboard,
  care: Sparkles,
  family: Users,
  shapes: Shapes,
  salary: Briefcase,
  freelance: Laptop,
  business: Building2,
  gift: Gift,
  piggy: PiggyBank,
  coins: Coins,
  home: Home,
  plane: Plane,
  shirt: Shirt,
  phone: Smartphone,
  book: BookOpen,
  fitness: Dumbbell,
  baby: Baby,
  wrench: Wrench,
  dots: MoreHorizontal,
};

export type IconKey = keyof typeof ICONS;

/** Resolve an icon key to a component, falling back to a neutral icon. */
export function getIcon(key: string): LucideIcon {
  return ICONS[key] ?? Shapes;
}

/** All available icon keys (for the custom-category picker). */
export const ICON_KEYS = Object.keys(ICONS);
