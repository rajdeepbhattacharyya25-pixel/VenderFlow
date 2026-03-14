import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

import { Key } from 'react';

interface SlotCharProps {
    targetChar: string;
    isActive: boolean;
    delay: number;
    className?: string;
    key?: Key;
}

function SlotChar({ targetChar, isActive, delay, className }: SlotCharProps) {
    const [currentChar, setCurrentChar] = useState(targetChar);
    const [isSettled, setIsSettled] = useState(true);

    useEffect(() => {
        if (!isActive) {
            setCurrentChar(targetChar);
            setIsSettled(true);
            return;
        }

        if (targetChar === ' ') {
            setCurrentChar(' ');
            setIsSettled(true);
            return;
        }

        setIsSettled(false);
        const iterations = 6 + Math.floor(Math.random() * 4);
        let count = 0;

        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                count++;
                if (count >= iterations) {
                    setCurrentChar(targetChar);
                    setIsSettled(true);
                    clearInterval(interval);
                } else {
                    setCurrentChar(CHARS[Math.floor(Math.random() * CHARS.length)]);
                }
            }, 60);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
    }, [isActive, targetChar, delay]);

    if (targetChar === ' ') {
        return <span>&nbsp;</span>;
    }

    return (
        <span className={`inline-block overflow-hidden ${className || ''}`}>
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={currentChar + (isSettled ? '-settled' : '')}
                    initial={{ y: '-100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="inline-block"
                >
                    {currentChar}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

interface SlotTextProps {
    text: string;
    className?: string;
    charClassName?: string;
    staggerMs?: number;
}

export default function SlotText({ text, className, charClassName, staggerMs = 50 }: SlotTextProps) {
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseEnter = useCallback(() => setIsHovering(true), []);
    const handleMouseLeave = useCallback(() => setIsHovering(false), []);

    return (
        <span
            className={`inline-flex cursor-pointer ${className || ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {text.split('').map((char, i) => (
                <SlotChar
                    key={i}
                    targetChar={char}
                    isActive={isHovering}
                    delay={i * staggerMs}
                    className={charClassName}
                />
            ))}
        </span>
    );
}
