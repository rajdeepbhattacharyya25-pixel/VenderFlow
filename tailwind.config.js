/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./dashboard/**/*.{js,ts,jsx,tsx}",
        "./landing page ui/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                heading: ['var(--font-heading)', 'Playfair Display', 'serif'],
                body: ['var(--font-body)', 'Inter', 'sans-serif'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "var(--color-bg)",
                foreground: "var(--color-text)",
                primary: {
                    DEFAULT: "var(--color-primary)",
                    foreground: "#ffffff",
                    light: "var(--color-primary-light)",
                    dark: "#064e3b", // Emerald 900
                },
                secondary: {
                    DEFAULT: "var(--color-secondary)",
                    foreground: "#1f2937",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "var(--color-muted)",
                    foreground: "#6b7280",
                },
                accent: {
                    DEFAULT: "var(--color-accent)",
                    foreground: "#ffffff",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Custom branding colors from inspiration
                'surface-dark': '#1F2937', // Matches luxury-card
                'background-dark': '#0F172A', // Deep slate for main bg in dark mode
                'border-dark': '#374151',
                'chart-line': 'var(--dashboard-chart-line)',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
}
