import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type AnimationType =
    | 'spin'
    | 'pulse'
    | 'bounce'
    | 'shake'
    | 'scale'
    | 'float'
    | 'tilt'
    | 'none';

interface AnimatedIconProps extends Omit<HTMLMotionProps<"div">, 'children'> {
    icon: LucideIcon;
    animation?: AnimationType;
    trigger?: 'hover' | 'always' | 'click' | 'inView';
    size?: number | string;
    color?: string;
    className?: string;
    iconClassName?: string;
    delay?: number;
    duration?: number;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
    icon: Icon,
    animation = 'none',
    trigger = 'hover',
    size = 24,
    color = 'currentColor',
    className,
    iconClassName,
    delay = 0,
    duration = 0.3,
    ...props
}) => {
    // Define animation variants based on the chosen type
    const getVariants = () => {
        switch (animation) {
            case 'spin':
                return {
                    initial: { rotate: 0 },
                    animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: 'linear' } },
                    hover: { rotate: 180, transition: { duration } },
                    tap: { rotate: 90, transition: { duration: 0.1 } }
                };
            case 'pulse':
                return {
                    initial: { scale: 1 },
                    animate: { scale: [1, 1.1, 1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
                    hover: { scale: 1.15, transition: { duration: 0.2 } },
                    tap: { scale: 0.9, transition: { duration: 0.1 } }
                };
            case 'bounce':
                return {
                    initial: { y: 0 },
                    animate: { y: [0, -8, 0], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
                    hover: { y: -5, transition: { type: 'spring', stiffness: 300 } },
                    tap: { y: 2, transition: { duration: 0.1 } }
                };
            case 'shake':
                return {
                    initial: { rotate: 0 },
                    animate: { rotate: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 } },
                    hover: { rotate: [0, -15, 15, -15, 15, 0], transition: { duration: 0.4 } },
                    tap: { scale: 0.9 }
                };
            case 'scale':
                return {
                    initial: { scale: 1 },
                    animate: { scale: 1 },
                    hover: { scale: 1.2, transition: { type: 'spring', stiffness: 400, damping: 10 } },
                    tap: { scale: 0.85, transition: { duration: 0.1 } }
                };
            case 'float':
                return {
                    initial: { y: 0 },
                    animate: { y: [-3, 3], transition: { duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } },
                    hover: { y: -4, transition: { duration: 0.3 } },
                    tap: { y: 1 }
                };
            case 'tilt':
                return {
                    initial: { rotate: 0 },
                    animate: { rotate: 0 },
                    hover: { rotate: 15, transition: { type: 'spring', stiffness: 300 } },
                    tap: { rotate: -15, transition: { duration: 0.1 } }
                };
            default:
                return {
                    initial: {},
                    animate: {},
                    hover: {},
                    tap: {}
                };
        }
    };

    const variants = getVariants();

    // Determine which states to actually apply based on the trigger
    let initial = 'initial';
    let animate = undefined;
    let whileHover = undefined;
    let whileTap = undefined;
    let whileInView = undefined;

    switch (trigger) {
        case 'always':
            animate = 'animate';
            break;
        case 'hover':
            whileHover = 'hover';
            // Fallback click animation for interactive feeling
            whileTap = 'tap';
            break;
        case 'click':
            whileTap = 'tap';
            break;
        case 'inView':
            whileInView = 'animate';
            break;
        default:
            break;
    }

    return (
        <motion.div
            className={cn("inline-flex items-center justify-center", className)}
            variants={variants}
            initial={initial}
            animate={animate}
            whileHover={whileHover}
            whileTap={whileTap}
            whileInView={whileInView}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay }}
            {...props}
        >
            <Icon
                size={size}
                color={color}
                className={cn("transition-colors", iconClassName)}
            />
        </motion.div>
    );
};

export default AnimatedIcon;
