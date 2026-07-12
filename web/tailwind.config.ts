import type { Config } from "tailwindcss";

/**
 * EcoSphere design tokens — source: DESIGN.md / colour.md
 * Use these utilities app-wide (e.g. bg-canvas, text-ink, bg-primary).
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#0075de",
          active: "#005bab",
          soft: "rgba(0, 117, 222, 0.08)",
        },
        secondary: {
          DEFAULT: "#213183",
          soft: "rgba(33, 49, 131, 0.08)",
        },
        tertiary: "#62aef0",
        // Surfaces
        canvas: {
          DEFAULT: "#f6f5f4",
          soft: "#f6f5f4",
        },
        surface: {
          DEFAULT: "#ffffff",
          elevated: "#ffffff",
        },
        // Text
        ink: {
          DEFAULT: "#000000",
          secondary: "#31302e",
          muted: "#615d59",
          faint: "#a39e98",
        },
        // Borders
        hairline: "#e6e6e6",
        line: {
          DEFAULT: "#e6e6e6",
          medium: "#dddddd",
          muted: "#ececec",
        },
        // Semantic
        success: {
          DEFAULT: "#1aae39",
          soft: "rgba(26, 174, 57, 0.12)",
        },
        warning: {
          DEFAULT: "#dd5b00",
          soft: "rgba(221, 91, 0, 0.12)",
        },
        danger: {
          DEFAULT: "#e03e3e",
          soft: "rgba(224, 62, 62, 0.1)",
        },
        // Decorative stickers (never for CTAs)
        accent: {
          purple: "#d6b6f6",
          pink: "#ff64c8",
          orange: "#dd5b00",
          teal: "#2a9d99",
          green: "#1aae39",
          sky: "#62aef0",
        },
        // Legacy CSS variable bridges (inline styles still use these)
        background: "var(--color-bg)",
        foreground: "var(--color-text-primary)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        xs: "4px",
        sm: "5px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        soft:
          "rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 4px 18px",
        elevated:
          "rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.03) 0 2.025px 7.847px, rgba(0,0,0,0.04) 0 8px 24px, rgba(0,0,0,0.05) 0 23px 52px",
      },
      maxWidth: {
        content: "1280px",
      },
      spacing: {
        18: "4.5rem",
        sidebar: "260px",
        "sidebar-collapsed": "64px",
      },
    },
  },
  plugins: [],
};

export default config;
