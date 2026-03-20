import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';



interface SlotCharProps {
    targetChar: string;
    isActive: boolean;
    delay: number;
    className?: string;
}

function SlotChar({ targetChar, isActive, delay, className }: SlotCharProps) {
    const [currentChar, setCurrentChar] = useState(targetChar);
    const [isSettled, setIsSettled] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isActive) {
            setCurrentChar(targetChar);
            setIsSettled(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        if (targetChar === ' ') {
            setCurrentChar(' ');
            setIsSettled(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        setIsSettled(false);
        const iterations = 6 + Math.floor(Math.random() * 4);
        let count = 0;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);

        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                count++;
                if (count >= iterations) {
                    setCurrentChar(targetChar);
                    setIsSettled(true);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    intervalRef.current = null;
                } else {
                    setCurrentChar(CHARS[Math.floor(Math.random() * CHARS.length)]);
                }
            }, 60);
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
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
