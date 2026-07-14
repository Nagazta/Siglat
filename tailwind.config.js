/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Grid Design Tokens ──────────────────────────────────────
        "grid-ink":      "#0B0F14",   // near-black navy — hero/nav base
        "live-amber":    "#FFB020",   // scheduled outage
        "fault-red":     "#E8432E",   // active/ongoing outage
        "restored-cyan": "#2DD4BF",   // power restored
        "spark-white":   "#F8FAFC",   // highlight text
        "circuit-dark":  "#1E293B",   // hairline traces on dark bg
        "circuit-light": "#E2E8F0",   // hairline traces on light bg

        // ── Legacy aliases so map/stats pages keep working ──────────
        primary: {
          DEFAULT: "#FFB020",
          light:   "#FFC94D",
          dark:    "#E09000",
        },
        secondary: {
          DEFAULT: "#475569",
          light:   "#64748B",
          dark:    "#334155",
        },
        accent:     "#FFB020",
        background: "#F8FAFC",
        success:    "#2DD4BF",
        warning:    "#FFB020",
        danger:     "#E8432E",
        surface:    "#FFFFFF",
        muted:      "#94A3B8",
        border:     "#E2E8F0",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },

      boxShadow: {
        soft:        "0 2px 8px rgba(0,0,0,0.06)",
        card:        "0 4px 16px rgba(0,0,0,0.08)",
        "card-dark": "0 4px 24px rgba(0,0,0,0.4)",
        glow:        "0 0 12px rgba(255,176,32,0.25)",
        amber:       "0 0 20px rgba(255,176,32,0.35)",
        fault:       "0 0 16px rgba(232,67,46,0.30)",
        cyan:        "0 0 14px rgba(45,212,191,0.25)",
      },

      borderRadius: {
        xl:    "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },

      animation: {
        "fade-in":       "fadeIn 0.3s ease-out",
        "slide-up":      "slideUp 0.4s ease-out",
        "slide-down":    "slideDown 0.3s ease-out",
        "pulse-slow":    "pulse 3s infinite",
        "waveform":      "waveformDraw 2s ease-out forwards",
        "waveform-idle": "waveformIdle 6s ease-in-out infinite",
        "meter-fill":    "meterFill 1.4s ease-out forwards",
        "ongoing-pulse": "ongoingPulse 1.8s ease-out infinite",
        "flicker":       "flicker 2.4s infinite",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        waveformDraw: {
          from: { strokeDashoffset: "1400" },
          to:   { strokeDashoffset: "0" },
        },
        waveformIdle: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-3px)" },
        },
        meterFill: {
          from: { width: "0%" },
          to:   { width: "var(--meter-width, 60%)" },
        },
        ongoingPulse: {
          "0%":   { boxShadow: "0 0 0 0 rgba(232,67,46,0.6)" },
          "70%":  { boxShadow: "0 0 0 8px rgba(232,67,46,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(232,67,46,0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1",   filter: "brightness(1)"   },
          "10%":      { opacity: "0.6", filter: "brightness(0.5)" },
          "12%":      { opacity: "1",   filter: "brightness(1.4)" },
          "20%":      { opacity: "0.7", filter: "brightness(0.6)" },
          "22%":      { opacity: "1",   filter: "brightness(1.2)" },
          "50%":      { opacity: "1",   filter: "brightness(1)"   },
          "60%":      { opacity: "0.5", filter: "brightness(0.4)" },
          "62%":      { opacity: "1",   filter: "brightness(1.5)" },
          "80%":      { opacity: "0.8", filter: "brightness(0.7)" },
          "82%":      { opacity: "1",   filter: "brightness(1.1)" },
        },
      },
    },
  },
  plugins: [],
};
