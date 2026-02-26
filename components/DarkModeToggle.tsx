import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { m } from 'framer-motion';

export function DarkModeToggle() {
    const { theme, setTheme, systemTheme } = useTheme();

    // Need to be careful with hydration mismatch, but in a client-only Vite app it's fine
    // or use a mounted state if needed.
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8" />;
    }

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const isDark = currentTheme === 'dark';

    const handleToggle = () => {
        const newTheme = isDark ? 'light' : 'dark';
        if (!document.startViewTransition) {
            setTheme(newTheme);
            return;
        }
        document.startViewTransition(() => {
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
            setTheme(newTheme);
        });
    };

    return (
        <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 transition-colors shadow-sm hover:shadow"
            aria-label="Toggle Dark Mode"
        >
            {isDark ? (
                <Sun className="w-4 h-4" />
            ) : (
                <Moon className="w-4 h-4" />
            )}
        </m.button>
    );
}
