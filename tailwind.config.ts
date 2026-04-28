import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-raised": "var(--bg-raised)",
        "bg-card": "var(--bg-card)",
        "bg-elevated": "var(--bg-elevated)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-glow": "var(--accent-glow)",
        "attr-str": "var(--attr-str)",
        "attr-int": "var(--attr-int)",
        "attr-cha": "var(--attr-cha)",
        "attr-wis": "var(--attr-wis)",
        "attr-cre": "var(--attr-cre)",
        "attr-gold": "var(--attr-gold)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
