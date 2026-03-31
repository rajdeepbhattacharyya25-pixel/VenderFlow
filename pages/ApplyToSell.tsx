import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Events } from '../lib/analytics';
import { notifyAdmin } from '../lib/notifications';
import toast from 'react-hot-toast';
import {
    ArrowRight, ArrowLeft, CheckCircle2, User, Mail,
    Phone, Building2, Tag, MapPin, Globe, MessageSquare, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Stitch Design Tokens ──────────────────────────────── */
const THEME = {
    bg: '#07080a',
    primary: '#059669', // Emerald Green
    primaryDim: 'rgba(5, 150, 105, 0.1)',
    primaryBorder: 'rgba(5, 150, 105, 0.2)',
    primaryGlow: 'rgba(5, 150, 105, 0.25)',
    secondary: '#e5e7eb', // Platinum Silver
    card: 'rgba(255, 255, 255, 0.02)',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    inputBg: 'rgba(255, 255, 255, 0.03)',
    inputBorder: 'rgba(255, 255, 255, 0.08)',
    inputFocus: 'rgba(5, 150, 105, 0.4)',
    text: '#ffffff',
    textMuted: '#9ca3af',
    textDim: 'rgba(255, 255, 255, 0.25)',
};

const STEPS = [
    { id: 1, label: 'Personal Info', icon: User },
    { id: 2, label: 'Business Details', icon: Building2 },
    { id: 3, label: 'Additional Info', icon: MessageSquare },
];

/* ─── Animation Variants ────────────────────────────────── */
const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
} as const;

const fieldContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
} as const;

const fieldVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
} as const;

/* ─── Step Progress Indicator ─────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center justify-between w-full mb-14 md:mb-16 relative px-1">
            {/* Background Trace Line */}
            <div className="absolute top-[20px] md:top-[28px] left-0 right-0 h-[1.5px] bg-white/5 z-0" />
            
            {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                    <div key={step.id} className="flex flex-col items-center relative z-10">
                        <motion.div
                            animate={{
                                background: isCompleted ? THEME.primary : isActive ? THEME.bg : THEME.bg,
                                borderColor: isCompleted ? THEME.primary : isActive ? THEME.primary : 'rgba(255,255,255,0.1)',
                                color: isCompleted ? THEME.bg : isActive ? THEME.primary : 'rgba(255,255,255,0.2)',
                                boxShadow: isActive ? `0 0 20px ${THEME.primaryGlow}` : 'none',
                                rotate: isActive ? 45 : 0
                            }}
                            className="w-12 h-12 md:w-14 md:h-14 border-[1px] flex items-center justify-center text-xs font-bold transition-all duration-500 backdrop-blur-xl"
                            style={{ 
                                borderRadius: '1px'
                            }}
                        >
                            <motion.div
                                animate={{ rotate: isActive ? -45 : 0 }}
                                className="flex items-center justify-center"
                            >
                                <AnimatePresence mode="wait">
                                    {isCompleted ? (
                                        <motion.div
                                            key="check"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 md:w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <motion.span
                                            key="id"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="font-mono tracking-tighter"
                                        >
                                            0{step.id}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                        
                        <motion.div
                            animate={{
                                opacity: isActive ? 1 : 0.4,
                                y: isActive ? 0 : 4
                            }}
                            className="absolute -bottom-7 flex flex-col items-center"
                        >
                            <span className="text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-[0.3em] font-black whitespace-nowrap text-white">
                                {step.label.split(' ')[0]}
                            </span>
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Floating Input (Stitch Style) ──────────────────────── */
function FloatingInput({ label, icon: Icon, required, error, ...props }: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
    error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(props.value);
    const isFloating = focused || hasValue;

    return (
        <div className="relative group w-full">
            <div
                className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.15)' }}
            >
                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            </div>
            <input
                {...props}
                required={required}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                placeholder=" "
                className="peer w-full text-base outline-none placeholder-transparent"
                style={{
                    padding: '28px 16px 10px 44px',
                    borderRadius: '2px', // Sharp
                    background: THEME.inputBg,
                    border: `1px solid ${error ? '#ef4444' : focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: THEME.text,
                    boxShadow: focused && !error
                        ? `inset 0 0 10px rgba(5,150,105,0.05)`
                        : 'none',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '64px',
                    backdropFilter: 'blur(10px)'
                }}
            />
            <label
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                    left: '44px',
                    ...(isFloating
                        ? {
                            top: '10px',
                            fontSize: '10px',
                            fontWeight: 900,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase' as const,
                            opacity: 0.5
                        }
                        : {
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px',
                            fontWeight: 400,
                            opacity: 0.4
                        }),
                color: error ? '#ef4444' : focused ? THEME.primary : THEME.text,
                }}
            >
                {label}{required && ' *'}
            </label>
            {error && <span className="absolute -bottom-4 left-1 text-[10px] text-red-500 font-medium">{error}</span>}
        </div>
    );
}

/* ─── Floating Select (Stitch Style) ─────────────────────── */
function FloatingSelect({ label, icon: Icon, required, children, error, ...props }: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(props.value);
    const isFloating = focused || hasValue;

    return (
        <div className="relative group w-full">
            <div
                className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.15)' }}
            >
                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            </div>
            <select
                {...props}
                required={required}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                className="peer w-full text-base appearance-none cursor-pointer outline-none"
                style={{
                    padding: '28px 40px 10px 44px',
                    borderRadius: '2px', // Sharp
                    background: THEME.inputBg,
                    border: `1px solid ${error ? '#ef4444' : focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: hasValue ? THEME.text : THEME.textDim,
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '60px'
                }}
            >
                {children}
            </select>
            <label
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                    left: '44px',
                    ...(isFloating
                        ? {
                            top: '10px',
                            fontSize: '10px',
                            fontWeight: 900,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase' as const,
                            opacity: 0.5
                        }
                        : {
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px',
                            fontWeight: 400,
                            opacity: 0.4
                        }),
                color: error ? '#ef4444' : focused ? THEME.primary : THEME.text,
                }}
            >
                {label}{required && ' *'}
            </label>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.1)' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                </svg>
            </div>
            {error && <span className="absolute -bottom-4 left-1 text-[10px] text-red-500 font-medium">{error}</span>}
        </div>
    );
}

/* ─── Floating Textarea (Stitch Style) ───────────────────── */
function FloatingTextarea({ label, icon: Icon, ...props }: {
    label: string;
    icon: React.ElementType;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(props.value);
    const isFloating = focused || hasValue;

    return (
        <div className="relative group w-full">
            <div
                className="absolute left-4 md:left-5 top-7 transition-colors duration-200 pointer-events-none"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.15)' }}
            >
                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            </div>
            <textarea
                {...props}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                placeholder=" "
                className="peer w-full text-base resize-none outline-none placeholder-transparent"
                style={{
                    padding: '30px 16px 16px 44px',
                    borderRadius: '2px', // Sharp
                    background: THEME.inputBg,
                    border: `1px solid ${focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: THEME.text,
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '120px'
                }}
            />
            <label
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                    left: '44px',
                    ...(isFloating
                        ? {
                            top: '10px',
                            fontSize: '10px',
                            fontWeight: 900,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase' as const,
                            opacity: 0.5
                        }
                        : {
                            top: '26px',
                            fontSize: '14px',
                            fontWeight: 400,
                            opacity: 0.4
                        }),
                    color: focused ? THEME.primary : THEME.text,
                }}
            >
                {label}
            </label>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ApplyToSell() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState(1);
    const [signupStarted, setSignupStarted] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        business_name: '',
        category: '',
        city: '',
        is_selling_online: false,
        monthly_sales_range: '',
        instagram: '',
        message: ''
    });

    const [isAdmin, setIsAdmin] = useState(false);

    React.useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profile?.role === 'admin') {
                    setIsAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);

    const [errors, setErrors] = useState<Record<string, string>>({});

    React.useEffect(() => {
        const saved = localStorage.getItem('vendorflow_apply_draft');
        if (saved) {
            try {
                const { data, savedStep } = JSON.parse(saved);
                if (data) setFormData(data);
                if (savedStep) setStep(savedStep);
            } catch (e) { console.error('Error loading draft', e); }
        }
    }, []);

    React.useEffect(() => {
        if (!success) {
            localStorage.setItem('vendorflow_apply_draft', JSON.stringify({ data: formData, savedStep: step }));
        }
    }, [formData, step, success]);

    const validateField = (name: string, value: unknown) => {
        let error = '';
        if (name === 'name' && String(value).trim().length < 2 && value !== '') error = 'Name is too short';
        if (name === 'email' && value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) error = 'Invalid email format';
        if (name === 'phone' && value !== '' && String(value).length < 7) error = 'Invalid phone number';
        if (name === 'business_name' && String(value).trim().length < 2 && value !== '') error = 'Business name is too short';
        if (name === 'city' && String(value).trim().length < 2 && value !== '') error = 'City is required';
        
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!signupStarted) {
            Events.signupStarted();
            setSignupStarted(true);
        }
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));
        validateField(name, finalValue);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            if (!formData.name || !formData.email || !formData.phone || !formData.business_name || !formData.city || !formData.category) {
                throw new Error("Please fill in all required fields.");
            }

            const { error } = await supabase
                .from('seller_applications')
                .insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    business_name: formData.business_name,
                    category: formData.category,
                    city: formData.city,
                    is_selling_online: formData.is_selling_online,
                    monthly_sales_range: formData.monthly_sales_range || null,
                    instagram: formData.instagram || null,
                    message: formData.message || null
                });

            if (error) {
                if (error.code === '23505') {
                    throw new Error("An application with this email or phone number is already pending review.");
                }
                throw error;
            }

            notifyAdmin({
                type: 'NEW_SELLER_APPLICATION',
                message: `New application: ${formData.business_name}`,
                data: formData
            });

            Events.applicationSubmitted({ category: formData.category });
            setSuccess(true);
            localStorage.removeItem('vendorflow_apply_draft');
            window.scrollTo(0, 0);

        } catch (err) {
            const error = err as Error;
            toast.error(error.message || 'Failed to submit application.');
        } finally {
            setLoading(false);
        }
    };

    const canProceedStep1 = formData.name && formData.email && formData.phone && !errors.name && !errors.email && !errors.phone;
    const canProceedStep2 = formData.business_name && formData.category && formData.city && !errors.business_name && !errors.city;

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) {
            toast.error('Please fill in all required fields correctly.');
            return;
        }
        if (step === 2 && !canProceedStep2) {
            toast.error('Please fill in all required fields correctly.');
            return;
        }

        if (step < 3) {
            setStep(s => s + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        setStep(s => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* ─── Success State ──────────────────────────────────── */
    if (success) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#07080a] font-[Inter,sans-serif] overflow-hidden">
                {/* Background cinematic elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2 }}
                        className="absolute inset-0 bg-[#ccff00]/[0.03] backdrop-blur-[100px]"
                    />
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.2 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ccff00] rounded-full blur-[160px]"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-xl w-full relative z-10"
                >
                    <div
                        className="relative rounded-[30px] md:rounded-[40px] p-6 md:p-16 text-center overflow-hidden border border-white/10"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            boxShadow: `0 40px 100px -20px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05)`,
                        }}
                    >
                        {/* Animated Checkmark Container */}
                        <div className="relative w-20 h-20 md:w-32 md:h-32 mx-auto mb-8 md:mb-10">
                            {/* Outer Rings */}
                            {[1, 1.2, 1.4].map((scale, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: scale, opacity: 0.1 - i * 0.03 }}
                                    transition={{
                                        duration: 1.5,
                                        delay: 0.5 + i * 0.2,
                                        ease: "easeOut",
                                        repeat: Infinity,
                                        repeatType: "reverse"
                                    }}
                                    className="absolute inset-0 rounded-full border-2 border-[#ccff00]"
                                />
                            ))}

                            {/* Main Circle */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.3 }}
                                className="absolute inset-0 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 backdrop-blur-sm flex items-center justify-center"
                            >
                                <svg className="w-16 h-16 text-[#ccff00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <motion.path
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{
                                            duration: 0.8,
                                            delay: 0.8,
                                            ease: "easeInOut"
                                        }}
                                        d="M20 6L9 17l-5-5"
                                    />
                                </svg>
                            </motion.div>
                        </div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1, duration: 0.6 }}
                            className="text-2xl md:text-5xl font-black uppercase tracking-tight mb-4 md:mb-6 text-white"
                        >
                            Application <br />
                            <span style={{ color: THEME.primary }}>Submitted</span>
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4, duration: 1 }}
                            className="space-y-6"
                        >
                            <p className="text-white/50 text-base md:text-xl font-light leading-relaxed max-w-sm mx-auto">
                                We've received your business details and will reach out within 24 hours.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(isAdmin ? '/admin/applications' : '/')}
                                    className="px-10 py-5 text-black font-black uppercase tracking-widest text-xs rounded-none transition-all"
                                    style={{ 
                                        background: THEME.primary,
                                        boxShadow: `0 20px 40px ${THEME.primaryDim}`
                                    }}
                                >
                                    {isAdmin ? 'View Applications' : 'Return to Home'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ─── Main Form ──────────────────────────────────────── */
    return (
        <div className="fixed inset-0 min-h-[100dvh] flex flex-col z-50 overflow-y-auto" style={{ background: THEME.bg, fontFamily: "'Inter', sans-serif" }}>

            {/* Close Button & Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-between px-4 py-0.5 md:px-8 md:py-1"
            >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: THEME.primary }} />
                    SSL Protected / Encrypted
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="p-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white scale-85 md:scale-100"
                    title="Close and return to home"
                    aria-label="Close form"
                >
                    <X className="w-4 h-4 md:w-5 h-5" />
                </button>
            </motion.div>

            {/* Background ambient light */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
                <div
                    className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[150px] opacity-[0.05]"
                    style={{ background: THEME.primary }}
                />
            </div>

            <main className="w-full max-w-6xl mx-auto px-6 pb-32 md:pb-12 flex-1 relative z-10 flex flex-col md:flex-row items-start justify-between pt-4 md:pt-24 gap-6 md:gap-20">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full md:w-1/2 text-left"
                >
                    <h1 className="text-2xl md:text-8xl font-black mb-4 md:mb-6 leading-[0.85] uppercase italic tracking-tighter text-white">
                        Vendor <br />
                        <span style={{ color: THEME.primary }}>// Flow</span>
                    </h1>
                    <p className="text-white/40 text-[13px] md:text-base font-light max-w-[280px] md:max-w-sm leading-relaxed tracking-wide">
                        Join an elite circle of commerce. Secure your place in the future of decentralized luxury retail and global distribution.
                    </p>
                    
                    <div className="mt-12 hidden md:block">
                        <div className="flex items-center gap-4 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">
                            <div className="w-12 h-[1px] bg-white/10" />
                            Premium Onboarding
                        </div>
                    </div>
                </motion.div>

                <div className="w-full md:w-[480px] flex-shrink-0 flex flex-col">
                    <StepIndicator currentStep={step} />

                    <div className="flex-1 mt-0">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full"
                                >
                                    <motion.div
                                        variants={fieldContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-5"
                                    >
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="Full Name"
                                                icon={User}
                                                name="name"
                                                type="text"
                                                value={formData.name}
                                                onChange={handleChange}
                                                error={errors.name}
                                                required
                                            />
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="Email Address"
                                                icon={Mail}
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                error={errors.email}
                                                required
                                            />
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="Phone / WhatsApp"
                                                icon={Phone}
                                                name="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                error={errors.phone}
                                                required
                                            />
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full"
                                >
                                    <motion.div
                                        variants={fieldContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-5"
                                    >
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="Business / Brand Name"
                                                icon={Building2}
                                                name="business_name"
                                                type="text"
                                                value={formData.business_name}
                                                onChange={handleChange}
                                                error={errors.business_name}
                                                required
                                            />
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingSelect
                                                label="Category"
                                                icon={Tag}
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                error={errors.category}
                                                required
                                            >
                                                <option value="" disabled>Select a category</option>
                                                <option value="fashion">Fashion & Apparel</option>
                                                <option value="electronics">Electronics & Gadgets</option>
                                                <option value="home">Home & Living</option>
                                                <option value="beauty">Health & Beauty</option>
                                                <option value="food">Food & Beverages</option>
                                                <option value="art">Art & Handmade</option>
                                                <option value="services">Digital Products</option>
                                                <option value="other">Other</option>
                                            </FloatingSelect>
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="City / Location"
                                                icon={MapPin}
                                                name="city"
                                                type="text"
                                                value={formData.city}
                                                onChange={handleChange}
                                                error={errors.city}
                                                required
                                            />
                                        </motion.div>

                                        <motion.div variants={fieldVariants}>
                                            <div 
                                                onClick={() => setFormData(p => ({ ...p, is_selling_online: !p.is_selling_online }))} 
                                                className="flex items-center justify-between p-6 rounded-none border transition-all cursor-pointer group hover:bg-white/[0.05]" 
                                                style={{
                                                    background: THEME.inputBg,
                                                    borderColor: THEME.inputBorder
                                                }}
                                            >
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Selling online currently?</h4>
                                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Check this if you have an existing store.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({ ...prev, is_selling_online: !prev.is_selling_online }));
                                                    }}
                                                    className="w-14 h-8 transition-colors relative"
                                                    style={{ 
                                                        background: formData.is_selling_online ? THEME.primary : 'rgba(255,255,255,0.05)',
                                                        border: `1px solid ${formData.is_selling_online ? THEME.primary : 'rgba(255,255,255,0.1)'}`
                                                    }}
                                                    title={formData.is_selling_online ? "Currently selling online" : "Not selling online"}
                                                    aria-label="Toggle selling online status"
                                                >
                                                    <motion.div 
                                                        animate={{ x: formData.is_selling_online ? 24 : 0 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        className="absolute top-1 left-1 w-5 h-5 bg-white" 
                                                    />
                                                </button>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full"
                                >
                                    <motion.div
                                        variants={fieldContainerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-5"
                                    >
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput label="Instagram or Website URL" icon={Globe} name="instagram" type="url" value={formData.instagram} onChange={handleChange} />
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingTextarea label="Tell us about what makes you unique" icon={MessageSquare} name="message" value={formData.message} onChange={handleChange} rows={4} />
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Buttons (Sticky Footer for Mobile) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto bg-[#07080a]/80 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-white/10 md:border-none p-4 md:p-0 md:mt-16 z-50 flex items-center gap-3 md:gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0"
                    >
                        {step > 1 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 md:flex-none py-4 px-6 rounded-none text-slate-400 font-bold transition-colors hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 border border-white/5 md:border-transparent hover:border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" /> Back
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-[2] md:flex-1 py-5 px-6 rounded-none font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
                            style={{
                                background: THEME.primary,
                                color: THEME.bg,
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 rounded-none animate-spin" style={{ borderColor: 'rgba(15,17,23,0.3)', borderTopColor: THEME.bg }} />
                                    Processing
                                </span>
                            ) : (
                                <>
                                    {step === 3 ? 'Confirm Membership' : 'Proceed'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
