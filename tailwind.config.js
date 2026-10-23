/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic design tokens driven by CSS variables (see src/index.css)
        base: "var(--c-base)",
        surface: "var(--c-surface)",
        surface2: "var(--c-surface-2)",
        elevated: "var(--c-elevated)",
        primary: "var(--c-primary)",
        secondary: "var(--c-secondary)",
        ink: "var(--c-text)",
        muted: "var(--c-text-muted)",
        line: "var(--c-border)",
        danger: "var(--c-danger)",
        warn: "var(--c-warn)",
        ok: "var(--c-ok)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(3, 7, 18, 0.35), 0 8px 24px rgba(3, 7, 18, 0.25)",
        pop: "0 12px 40px rgba(3, 7, 18, 0.45)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(0.7)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.18s ease-out",
        "slide-up": "slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        pop: "pop 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
