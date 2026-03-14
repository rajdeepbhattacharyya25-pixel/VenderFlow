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
    bg: '#0f1117',
    primary: '#13eca4',
    primaryDim: 'rgba(19, 236, 164, 0.1)',
    primaryBorder: 'rgba(19, 236, 164, 0.2)',
    primaryGlow: 'rgba(19, 236, 164, 0.25)',
    card: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    inputBg: 'rgba(255, 255, 255, 0.05)',
    inputBorder: 'rgba(255, 255, 255, 0.1)',
    inputFocus: 'rgba(19, 236, 164, 0.5)',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.4)',
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
};

const fieldContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const fieldVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

/* ─── Step Progress Indicator ─────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8 md:mb-12">
            {STEPS.map((step, i) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                    <React.Fragment key={step.id}>
                        {i > 0 && (
                            <div className="h-[2px] flex-1 max-w-[60px] md:max-w-[80px] mx-1 rounded-full relative overflow-hidden bg-white/10">
                                <motion.div
                                    className="absolute inset-0 origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    style={{ background: THEME.primary }}
                                />
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-2 relative z-10">
                            <motion.div
                                animate={{
                                    background: isCompleted ? THEME.primary : isActive ? THEME.primaryDim : 'rgba(255,255,255,0.05)',
                                    borderColor: isCompleted ? THEME.primary : isActive ? THEME.primary : 'rgba(255,255,255,0.1)',
                                    color: isCompleted ? THEME.bg : isActive ? THEME.primary : 'rgba(255,255,255,0.25)',
                                    boxShadow: isActive ? `0 0 20px ${THEME.primaryGlow}, 0 0 40px rgba(19,236,164,0.1)` : 'none',
                                    scale: isActive ? 1.1 : 1
                                }}
                                transition={{ duration: 0.3 }}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold border-2"
                            >
                                <AnimatePresence mode="popLayout">
                                    {isCompleted ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                                        >
                                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                                        </motion.div>
                                    ) : (
                                        <motion.span
                                            key="number"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                        >
                                            {step.id}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                            <motion.span
                                animate={{
                                    color: isActive ? THEME.primary : isCompleted ? 'rgba(19,236,164,0.6)' : 'rgba(255,255,255,0.2)'
                                }}
                                className="text-[10px] md:text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap absolute -bottom-6"
                            >
                                {step.label}
                            </motion.span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/* ─── Floating Input (Stitch Style) ──────────────────────── */
function FloatingInput({ label, icon: Icon, required, ...props }: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(props.value);
    const isFloating = focused || hasValue;

    return (
        <div className="relative group w-full">
            <div
                className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.2)' }}
            >
                <Icon className="w-[18px] h-[18px]" />
            </div>
            <input
                {...props}
                required={required}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                placeholder=" "
                className="peer w-full text-base outline-none placeholder-transparent"
                style={{
                    padding: '24px 16px 12px 48px',
                    borderRadius: '16px',
                    background: THEME.inputBg,
                    border: `1.5px solid ${focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: THEME.text,
                    boxShadow: focused
                        ? `0 0 0 3px rgba(19,236,164,0.08), 0 0 20px rgba(19,236,164,0.06)`
                        : 'none',
                    transition: 'all 0.3s ease',
                }}
            />
            <label
                className="absolute pointer-events-none transition-all duration-200"
                style={{
                    left: '48px',
                    ...(isFloating
                        ? {
                            top: '8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                        }
                        : {
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '15px',
                            fontWeight: 400,
                        }),
                    color: focused ? THEME.primary : THEME.textDim,
                }}
            >
                {label}{required && ' *'}
            </label>
        </div>
    );
}

/* ─── Floating Select (Stitch Style) ─────────────────────── */
function FloatingSelect({ label, icon: Icon, required, children, ...props }: {
    label: string;
    icon: React.ElementType;
    required?: boolean;
    children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(props.value);
    const isFloating = focused || hasValue;

    return (
        <div className="relative group w-full">
            <div
                className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.2)' }}
            >
                <Icon className="w-[18px] h-[18px]" />
            </div>
            <select
                {...props}
                required={required}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                className="peer w-full text-base appearance-none cursor-pointer outline-none"
                style={{
                    padding: '24px 40px 12px 48px',
                    borderRadius: '16px',
                    background: THEME.inputBg,
                    border: `1.5px solid ${focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: hasValue ? THEME.text : THEME.textDim,
                    boxShadow: focused
                        ? `0 0 0 3px rgba(19,236,164,0.08), 0 0 20px rgba(19,236,164,0.06)`
                        : 'none',
                    transition: 'all 0.3s ease',
                }}
            >
                {children}
            </select>
            <label
                className="absolute pointer-events-none transition-all duration-200"
                style={{
                    left: '48px',
                    ...(isFloating
                        ? {
                            top: '8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                        }
                        : {
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '15px',
                            fontWeight: 400,
                        }),
                    color: focused ? THEME.primary : THEME.textDim,
                }}
            >
                {label}{required && ' *'}
            </label>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
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
                className="absolute left-4 top-5 transition-colors duration-200 pointer-events-none"
                style={{ color: focused ? THEME.primary : 'rgba(255,255,255,0.2)' }}
            >
                <Icon className="w-[18px] h-[18px]" />
            </div>
            <textarea
                {...props}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                placeholder=" "
                className="peer w-full text-base resize-none outline-none placeholder-transparent"
                style={{
                    padding: '28px 16px 16px 48px',
                    borderRadius: '16px',
                    background: THEME.inputBg,
                    border: `1.5px solid ${focused ? THEME.inputFocus : THEME.inputBorder}`,
                    color: THEME.text,
                    boxShadow: focused
                        ? `0 0 0 3px rgba(19,236,164,0.08), 0 0 20px rgba(19,236,164,0.06)`
                        : 'none',
                    transition: 'all 0.3s ease',
                }}
            />
            <label
                className="absolute pointer-events-none transition-all duration-200"
                style={{
                    left: '48px',
                    ...(isFloating
                        ? {
                            top: '8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                        }
                        : {
                            top: '20px',
                            fontSize: '15px',
                            fontWeight: 400,
                        }),
                    color: focused ? THEME.primary : THEME.textDim,
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
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
            window.scrollTo(0, 0);

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit application.');
        } finally {
            setLoading(false);
        }
    };

    const canProceedStep1 = formData.name && formData.email && formData.phone;
    const canProceedStep2 = formData.business_name && formData.category && formData.city;

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) {
            toast.error('Please fill in all required fields.');
            return;
        }
        if (step === 2 && !canProceedStep2) {
            toast.error('Please fill in all required fields.');
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1117]/95 backdrop-blur-3xl font-[Inter,sans-serif]">
                {/* Background ambient light */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.15 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 max-w-2xl mx-auto rounded-full blur-[120px] pointer-events-none"
                    style={{ background: THEME.primary }}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, type: "spring", damping: 25 }}
                    className="max-w-md w-full relative z-10"
                >
                    <div
                        className="relative rounded-[32px] p-10 text-center overflow-hidden"
                        style={{
                            background: THEME.card,
                            border: `1px solid ${THEME.cardBorder}`,
                            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 relative"
                            style={{
                                background: THEME.primaryDim,
                                border: `1px solid ${THEME.primaryBorder}`,
                            }}
                        >
                            <motion.div
                                animate={{
                                    opacity: [0.5, 1, 0.5],
                                    scale: [1, 1.2, 1]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-2xl blur-xl"
                                style={{ background: THEME.primaryGlow }}
                            />
                            <CheckCircle2 className="w-10 h-10 relative z-10" style={{ color: THEME.primary }} />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-2xl font-bold mb-4"
                            style={{ color: THEME.text }}
                        >
                            Application Received
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-base leading-relaxed mb-10"
                            style={{ color: THEME.textMuted }}
                        >
                            Thank you for your interest in VendorFlow. Our team will review your application and contact you within 24 hours.
                        </motion.p>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            onClick={() => navigate('/')}
                            className="group relative w-full font-bold py-4 rounded-2xl overflow-hidden transition-transform active:scale-95"
                            style={{
                                color: THEME.bg,
                                background: THEME.primary,
                            }}
                        >
                            <span className="relative z-10">Return to Home</span>
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)' }}
                            />
                        </motion.button>
                    </div>
                </motion.div >
            </div >
        );
    }

    /* ─── Main Form ──────────────────────────────────────── */
    return (
        <div className="fixed inset-0 min-h-[100dvh] flex flex-col z-50 overflow-y-auto" style={{ background: THEME.bg, fontFamily: "'Inter', sans-serif" }}>

            {/* Close Button & Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-between p-4 md:p-8"
            >
                <div></div>
                <button
                    onClick={() => navigate('/')}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </motion.div>

            {/* Background ambient light */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
                <div
                    className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[150px] opacity-[0.05]"
                    style={{ background: THEME.primary }}
                />
            </div>

            <main className="w-full max-w-xl mx-auto px-4 pb-24 md:pb-12 flex-1 relative z-10 flex flex-col pt-4 md:pt-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Start Selling
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base max-w-sm mx-auto">
                        Join our curated community of premium sellers on VendorFlow.
                    </p>
                </motion.div>

                <div className="w-full flex-1 flex flex-col">
                    <StepIndicator currentStep={step} />

                    <div className="flex-1 mt-6">
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
                                                options={[
                                                    { value: '', label: 'Select a category' },
                                                    { value: 'fashion', label: 'Fashion & Apparel' },
                                                    { value: 'electronics', label: 'Electronics & Gadgets' },
                                                    { value: 'home', label: 'Home & Living' },
                                                    { value: 'beauty', label: 'Health & Beauty' },
                                                    { value: 'food', label: 'Food & Beverages' },
                                                    { value: 'art', label: 'Art & Handmade' },
                                                    { value: 'services', label: 'Digital Products' },
                                                    { value: 'other', label: 'Other' },
                                                ]}
                                                required
                                            />
                                        </motion.div>
                                        <motion.div variants={fieldVariants}>
                                            <FloatingInput
                                                label="City / Location"
                                                icon={MapPin}
                                                name="city"
                                                type="text"
                                                value={formData.city}
                                                onChange={handleChange}
                                                required
                                            />
                                        </motion.div>

                                        <motion.div variants={fieldVariants}>
                                            <div onClick={() => setFormData(p => ({ ...p, is_selling_online: !p.is_selling_online }))} className="flex items-center justify-between p-5 rounded-2xl border transition-colors cursor-pointer active:scale-[0.99]" style={{
                                                background: THEME.inputBg,
                                                borderColor: THEME.inputBorder
                                            }}>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white">Selling online currently?</h4>
                                                    <p className="text-[12px] text-slate-400 mt-1">Check this if you have an existing store.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="w-12 h-6 rounded-full transition-colors relative"
                                                    style={{ background: formData.is_selling_online ? THEME.primary : 'rgba(255,255,255,0.1)' }}
                                                >
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_selling_online ? 'translate-x-6' : 'translate-x-0'}`} />
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

                    {/* Navigation Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3 md:gap-4 mt-12 md:mt-16 pt-6 border-t border-white/10"
                    >
                        {step > 1 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 md:flex-none py-4 px-6 rounded-2xl text-slate-400 font-bold transition-colors hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 border border-transparent hover:border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" /> Back
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-[2] md:flex-1 py-4 px-6 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden"
                            style={{
                                background: THEME.primary,
                                color: THEME.bg,
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(15,17,23,0.3)', borderTopColor: THEME.bg }} />
                                    Submitting
                                </span>
                            ) : (
                                <>
                                    {step === 3 ? 'Submit Application' : 'Continue'} <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
