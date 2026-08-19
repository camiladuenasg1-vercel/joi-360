// Theme system — mirrors iOS PremiumTheme per vertical
export const THEMES = {
  "Educación": {
    accent: "#1A3270", secondary: "#1A3270", bg: "from-[#1A3270] via-[#1a2fbf] to-[#1A3270]",
    card: "bg-blue-950/80", pill: "bg-blue-700/30 text-blue-100", isDark: true,
  },
  "Centro Comercial": {
    accent: "#2E7FD9", secondary: "#1A3270", bg: "from-[#2E7FD9] via-[#005577] to-[#1A3270]",
    card: "bg-teal-950/80", pill: "bg-teal-700/30 text-teal-100", isDark: true,
  },
  "Empresa": {
    accent: "#0D1A45", secondary: "#2E7FD9", bg: "from-[#0D1A45] via-[#243557] to-[#2E7FD9]",
    card: "bg-slate-900/80", pill: "bg-slate-700/30 text-slate-100", isDark: true,
  },
  "Club": {
    accent: "#0BA878", secondary: "#087A5C", bg: "from-[#0BA878] via-[#155f30] to-[#087A5C]",
    card: "bg-green-950/80", pill: "bg-green-700/30 text-green-100", isDark: true,
  },
  "Retail": {
    accent: "#8E6200", secondary: "#E06B00", bg: "from-[#8E6200] via-[#92400e] to-[#E06B00]",
    card: "bg-amber-950/80", pill: "bg-amber-700/30 text-amber-100", isDark: true,
  },
  "Especial RedPontis": {
    accent: "#1A3270", secondary: "#1A3270", bg: "from-[#1A3270] via-[#4000a0] to-[#1A3270]",
    card: "bg-purple-950/80", pill: "bg-purple-700/30 text-purple-100", isDark: true,
  },
};
export const DEFAULT_THEME = THEMES["Educación"];
export function getTheme(vertical) { return THEMES[vertical] || DEFAULT_THEME; }
