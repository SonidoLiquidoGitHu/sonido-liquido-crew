import { Mic, Disc3, Music2, MicVocal, Sparkles, Radio, LucideIcon } from "lucide-react";

export interface RoleConfig {
  value: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ARTIST_ROLES: RoleConfig[] = [
  {
    value: "mc",
    label: "MC / Rapper",
    shortLabel: "MC",
    icon: Mic,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  {
    value: "dj",
    label: "DJ",
    shortLabel: "DJ",
    icon: Disc3,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    value: "producer",
    label: "Productor",
    shortLabel: "Prod",
    icon: Music2,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  {
    value: "cantante",
    label: "Cantante",
    shortLabel: "Cant",
    icon: MicVocal,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
  },
  {
    value: "divo",
    label: "Divo",
    shortLabel: "Divo",
    icon: Sparkles,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  {
    value: "lado_b",
    label: "Lado B",
    shortLabel: "LB",
    icon: Radio,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
];

/**
 * Get role configuration by value
 */
export function getRoleConfig(value: string): RoleConfig | undefined {
  return ARTIST_ROLES.find((r) => r.value === value);
}

/**
 * Get multiple role configurations from comma-separated string
 */
export function getRolesFromString(rolesString: string | null | undefined): RoleConfig[] {
  if (!rolesString) return [];
  return rolesString
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => getRoleConfig(r))
    .filter((r): r is RoleConfig => r !== undefined);
}

/**
 * Get display labels from roles string
 */
export function getRoleLabels(rolesString: string | null | undefined, useShort = false): string[] {
  const roles = getRolesFromString(rolesString);
  return roles.map((r) => (useShort ? r.shortLabel : r.label));
}

/**
 * Get formatted display string from roles
 */
export function getArtistRolesDisplay(rolesString: string | null | undefined, separator = " • "): string {
  const labels = getRoleLabels(rolesString);
  return labels.length > 0 ? labels.join(separator) : "Artista";
}
