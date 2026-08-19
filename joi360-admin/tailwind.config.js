/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // JoiSolutions Design System (v1.0, 17-ago-2026) — Brand Navy + Gold,
        // mismo remapeo que joi360-app, nombres de token conservados.
        primary: "#1A3270",
        "primary-container": "#3B5BDB",
        "primary-fixed": "#DCE4FA",
        "primary-fixed-dim": "#CDD1E4",
        "on-primary": "#ffffff",
        secondary: "#2E7FD9",
        "secondary-container": "#8E6200",
        "secondary-fixed": "#EAF3FC",
        accent: "#F5C200",
        "accent-on": "#0D1A45",
        "accent-text": "#8E6200",
        tertiary: "#8E6200",
        "tertiary-fixed": "#FEF3B0",
        "tertiary-container": "#E06B00",
        error: "#E8394B",
        "error-container": "#FBE7E9",
        surface: "#F2F2F7",
        "surface-bright": "#F2F2F7",
        "surface-hero": "#0D1A45",
        "surface-dim": "#CDD1E4",
        "surface-container": "#EEF2FD",
        "surface-container-low": "#F2F2F7",
        "surface-container-high": "#DCE4FA",
        "surface-container-highest": "#CDD1E4",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#1C1C1E",
        // "Text Secondary" del kit (#8A8FA8) es demasiado claro para texto/
        // iconos de estado default sobre fondo blanco -- reportado en vivo
        // (13-ago). Sube a Neutral 600 (#404255) del propio kit, ya validado
        // en las tabs. outline-variant (bordes) NO se toca, sigue clara.
        "on-surface-variant": "#404255",
        outline: "#404255",
        "outline-variant": "#CDD1E4",
        background: "#F2F2F7",
        ok: "#0BA878",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
