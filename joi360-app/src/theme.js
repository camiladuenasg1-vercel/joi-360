// Theme system — mirrors iOS PremiumTheme per vertical
export const THEMES = {
  "Educación": {
    accent: "#0035b9", secondary: "#5800c3", bg: "from-[#0035b9] via-[#1a2fbf] to-[#5800c3]",
    card: "bg-blue-950/80", pill: "bg-blue-700/30 text-blue-100", isDark: true,
  },
  "Centro Comercial": {
    accent: "#006688", secondary: "#0035b9", bg: "from-[#006688] via-[#005577] to-[#0035b9]",
    card: "bg-teal-950/80", pill: "bg-teal-700/30 text-teal-100", isDark: true,
  },
  "Empresa": {
    accent: "#1a2b4a", secondary: "#006688", bg: "from-[#1a2b4a] via-[#243557] to-[#006688]",
    card: "bg-slate-900/80", pill: "bg-slate-700/30 text-slate-100", isDark: true,
  },
  "Club": {
    accent: "#1a7a3c", secondary: "#0a5a2c", bg: "from-[#1a7a3c] via-[#155f30] to-[#0a5a2c]",
    card: "bg-green-950/80", pill: "bg-green-700/30 text-green-100", isDark: true,
  },
  "Retail": {
    accent: "#7e3000", secondary: "#b45309", bg: "from-[#7e3000] via-[#92400e] to-[#b45309]",
    card: "bg-amber-950/80", pill: "bg-amber-700/30 text-amber-100", isDark: true,
  },
  "Especial RedPontis": {
    accent: "#5800c3", secondary: "#0035b9", bg: "from-[#5800c3] via-[#4000a0] to-[#0035b9]",
    card: "bg-purple-950/80", pill: "bg-purple-700/30 text-purple-100", isDark: true,
  },
};
export const DEFAULT_THEME = THEMES["Educación"];
export function getTheme(vertical) { return THEMES[vertical] || DEFAULT_THEME; }
