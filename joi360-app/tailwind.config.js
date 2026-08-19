export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // JoiSolutions Design System (v1.0, 17-ago-2026) — Brand Navy + Gold.
        // Nombres de token M3 conservados (bg-primary, text-on-surface, etc.)
        // para que cualquier componente que ya los use se rebrandee solo.
        primary: "#1A3270",
        "primary-container": "#3B5BDB",
        "on-primary": "#ffffff",
        "primary-fixed": "#DCE4FA",
        "primary-fixed-dim": "#CDD1E4",
        accent: "#F5C200",
        "accent-on": "#0D1A45",
        "accent-text": "#8E6200",
        secondary: "#404255",
        "secondary-container": "#DCE4FA",
        "secondary-fixed": "#DCE4FA",
        tertiary: "#8E6200",
        "tertiary-fixed": "#FEF3B0",
        background: "#F2F2F7",
        surface: "#FFFFFF",
        "surface-bright": "#FFFFFF",
        "surface-hero": "#0D1A45",
        "surface-dim": "#CDD1E4",
        "surface-variant": "#CDD1E4",
        "surface-container": "#EEF2FD",
        "surface-container-low": "#F2F2F7",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#DCE4FA",
        "surface-container-highest": "#CDD1E4",
        "on-surface": "#1C1C1E",
        // "Text Secondary" del kit (#8A8FA8) es demasiado claro para texto/
        // iconos de estado default sobre fondo blanco -- reportado en vivo
        // (13-ago). Sube a Neutral 600 (#404255, = secondary). outline-variant
        // (bordes) NO se toca, sigue clara.
        "on-surface-variant": "#404255",
        outline: "#404255",
        "outline-variant": "#CDD1E4",
        success: "#0BA878",
        warning: "#E06B00",
        error: "#E8394B",
        info: "#2E7FD9",
        "inverse-surface": "#0D1A45",
        "inverse-primary": "#DCE4FA",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      fontSize: {
        "display": ["44px", { lineHeight: "48px", letterSpacing: "-0.04em", fontWeight: "800" }],
        "headline-xl": ["28px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "26px", fontWeight: "600" }],
        "body-lg": ["17px", { lineHeight: "24px" }],
        "body-md": ["15px", { lineHeight: "22px" }],
        "label-md": ["13px", { lineHeight: "18px", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "16px", fontWeight: "500" }],
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
}
