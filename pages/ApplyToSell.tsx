import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Events } from '../lib/analytics';
import { notifyAdmin } from '../lib/notifications';
import toast from 'react-hot-toast';
import {
    ArrowRight, ArrowLeft, CheckCircle2, Store, User, Mail,
    Phone, Building2, Tag, MapPin, Globe, MessageSquare, Sparkles
} from 'lucide-react';

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

/* ─── Step Progress Indicator (Stitch Style) ─────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-10">
            {STEPS.map((step, i) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                    <React.Fragment key={step.id}>
                        {i > 0 && (
                            <div
                                className="h-[2px] flex-1 max-w-[80px] mx-1 rounded-full transition-all duration-500"
                                style={{
                                    background: isCompleted
                                        ? THEME.primary
                                        : 'rgba(255,255,255,0.08)',
                                }}
                            />
                        )}
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
                                style={{
                                    background: isCompleted
                                        ? THEME.primary
                                        : isActive
                                            ? THEME.primaryDim
                                            : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${isCompleted
                                        ? THEME.primary
                                        : isActive
                                            ? THEME.primary
                                            : 'rgba(255,255,255,0.1)'}`,
                                    color: isCompleted
                                        ? THEME.bg
                                        : isActive
                                            ? THEME.primary
                                            : 'rgba(255,255,255,0.25)',
                                    boxShadow: isActive
                                        ? `0 0 20px ${THEME.primaryGlow}, 0 0 40px rgba(19,236,164,0.1)`
                                        : 'none',
                                }}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <span
                                className="text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap transition-colors duration-300"
                                style={{
                                    color: isActive
                                        ? THEME.primary
                                        : isCompleted
                                            ? 'rgba(19,236,164,0.6)'
                                            : 'rgba(255,255,255,0.2)',
                                }}
                            >
                                {step.label}
                            </span>
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
        <div className="relative group">
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
                className="peer w-full text-sm outline-none placeholder-transparent"
                style={{
                    padding: '22px 16px 10px 48px',
                    borderRadius: '14px',
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
                            fontSize: '14px',
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
        <div className="relative group">
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
                className="peer w-full text-sm appearance-none cursor-pointer outline-none"
                style={{
                    padding: '22px 40px 10px 48px',
                    borderRadius: '14px',
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
                            fontSize: '14px',
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
        <div className="relative group">
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
                className="peer w-full text-sm resize-none outline-none placeholder-transparent"
                style={{
                    padding: '26px 16px 12px 48px',
                    borderRadius: '14px',
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
                            fontSize: '14px',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

    const nextStep = () => {
        if (step === 1 && !canProceedStep1) {
            toast.error('Please fill in all required fields.');
            return;
        }
        if (step === 2 && !canProceedStep2) {
            toast.error('Please fill in all required fields.');
            return;
        }
        setStep(s => Math.min(s + 1, 3));
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    /* ─── Success State ──────────────────────────────────── */
    if (success) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: THEME.bg, fontFamily: "'Manrope', 'Inter', sans-serif" }}>
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="max-w-md w-full relative">
                        {/* Glow backdrop */}
                        <div
                            className="absolute -inset-4 rounded-[32px] blur-2xl opacity-40"
                            style={{ background: `radial-gradient(circle, ${THEME.primaryGlow} 0%, transparent 70%)` }}
                        />
                        <div
                            className="relative rounded-2xl p-10 text-center"
                            style={{
                                background: THEME.card,
                                backdropFilter: 'blur(40px)',
                                border: `1px solid ${THEME.cardBorder}`,
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                                style={{
                                    background: THEME.primaryDim,
                                    border: `1.5px solid ${THEME.primaryBorder}`,
                                    boxShadow: `0 0 30px ${THEME.primaryGlow}`,
                                }}
                            >
                                <CheckCircle2 className="w-8 h-8" style={{ color: THEME.primary }} />
                            </div>
                            <h2 className="text-2xl font-bold mb-3" style={{ color: THEME.text }}>
                                Application Received!
                            </h2>
                            <p className="text-sm leading-relaxed mb-8" style={{ color: THEME.textMuted }}>
                                Thank you for your interest in VenderFlow. Our team will review your application and contact you within 24 hours.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full font-bold py-3.5 px-6 rounded-xl transition-all duration-300 active:scale-[0.98]"
                                style={{
                                    background: `linear-gradient(135deg, ${THEME.primary}, #0dd9a0)`,
                                    color: THEME.bg,
                                    boxShadow: `0 8px 24px ${THEME.primaryGlow}`,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px rgba(19,236,164,0.4)`)}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.primaryGlow}`)}
                            >
                                Return to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Main Form ──────────────────────────────────────── */
    return (
        <div className="min-h-screen flex flex-col" style={{ background: THEME.bg, fontFamily: "'Manrope', 'Inter', sans-serif" }}>

            {/* Background ambient light */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[150px] opacity-[0.04]"
                    style={{ background: THEME.primary }}
                />
                <div
                    className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full blur-[120px] opacity-[0.03]"
                    style={{ background: THEME.primary }}
                />
                {/* Decorative circles (from Stitch) */}
                <div className="absolute bottom-10 right-10 flex gap-4 opacity-30 pointer-events-none">
                    <div className="w-24 h-24 rounded-full blur-xl" style={{ border: `1px solid ${THEME.primaryBorder}` }} />
                    <div className="w-16 h-16 rounded-full blur-lg mt-8" style={{ border: `1px solid rgba(19,236,164,0.1)` }} />
                </div>
            </div>

            <main className="flex-grow py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-xl mx-auto">
                    {/* Back navigation */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-sm font-medium mb-8 transition-colors duration-200"
                        style={{ color: THEME.textDim }}
                        onMouseEnter={e => (e.currentTarget.style.color = THEME.textMuted)}
                        onMouseLeave={e => (e.currentTarget.style.color = THEME.textDim)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Home
                    </button>

                    {/* Header section */}
                    <div className="text-center mb-8">
                        <div
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-5"
                            style={{
                                background: THEME.primaryDim,
                                border: `1px solid ${THEME.primaryBorder}`,
                                color: THEME.primary,
                            }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Seller Application
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3" style={{ color: THEME.text }}>
                            Apply to Sell on{' '}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: `linear-gradient(135deg, ${THEME.primary}, #0dd9a0, #10d4e2)` }}
                            >
                                VenderFlow
                            </span>
                        </h1>
                        <p className="text-base max-w-md mx-auto leading-relaxed" style={{ color: THEME.textMuted }}>
                            Join our curated community of premium sellers
                        </p>
                    </div>

                    {/* Glassmorphism Card */}
                    <div className="relative">
                        {/* Card glow */}
                        <div
                            className="absolute -inset-2 rounded-[28px] blur-xl opacity-25"
                            style={{ background: `linear-gradient(180deg, ${THEME.primaryGlow} 0%, transparent 50%)` }}
                        />
                        <div
                            className="relative rounded-2xl overflow-hidden"
                            style={{
                                background: THEME.card,
                                backdropFilter: 'blur(40px)',
                                border: `1px solid ${THEME.cardBorder}`,
                                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div className="p-6 sm:p-10">
                                <StepIndicator currentStep={step} />

                                <form onSubmit={handleSubmit}>
                                    {/* ─── Step 1: Personal Info ──── */}
                                    <div className={`space-y-5 ${step === 1 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}`}>
                                        <FloatingInput label="Full Name" icon={User} required name="name" type="text" value={formData.name} onChange={handleChange} />
                                        <FloatingInput label="Email Address" icon={Mail} required name="email" type="email" value={formData.email} onChange={handleChange} />
                                        <FloatingInput label="Phone / WhatsApp" icon={Phone} required name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                                    </div>

                                    {/* ─── Step 2: Business Details ──── */}
                                    <div className={`space-y-5 ${step === 2 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}`}>
                                        <FloatingInput label="Business / Brand Name" icon={Building2} required name="business_name" type="text" value={formData.business_name} onChange={handleChange} />
                                        <FloatingSelect label="Category" icon={Tag} required name="category" value={formData.category} onChange={handleChange}>
                                            <option value="">Select a category</option>
                                            <option value="fashion">Fashion & Apparel</option>
                                            <option value="electronics">Electronics & Gadgets</option>
                                            <option value="home">Home & Living</option>
                                            <option value="beauty">Health & Beauty</option>
                                            <option value="food">Food & Beverages</option>
                                            <option value="art">Art & Handmade</option>
                                            <option value="services">Digital Products / Services</option>
                                        </FloatingSelect>
                                        <FloatingInput label="City / Location" icon={MapPin} required name="city" type="text" value={formData.city} onChange={handleChange} />

                                        {/* Toggle switch (Stitch style) */}
                                        <div
                                            className="rounded-xl p-4"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.cardBorder}` }}
                                        >
                                            <label className="flex items-center cursor-pointer">
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        name="is_selling_online"
                                                        checked={formData.is_selling_online}
                                                        onChange={handleChange}
                                                        className="sr-only peer"
                                                    />
                                                    <div
                                                        className="w-11 h-6 rounded-full peer-focus:ring-2 transition-colors duration-300"
                                                        style={{
                                                            background: formData.is_selling_online ? `${THEME.primary}66` : 'rgba(255,255,255,0.1)',
                                                            ringColor: `${THEME.primary}33`,
                                                        }}
                                                    />
                                                    <div
                                                        className="absolute w-5 h-5 rounded-full shadow-md transition-all duration-300"
                                                        style={{
                                                            left: formData.is_selling_online ? '24px' : '2px',
                                                            top: '2px',
                                                            background: formData.is_selling_online ? THEME.primary : 'rgba(255,255,255,0.4)',
                                                        }}
                                                    />
                                                </div>
                                                <span className="ml-3 text-sm font-medium" style={{ color: THEME.textMuted }}>
                                                    Currently selling online?
                                                </span>
                                            </label>
                                        </div>

                                        {formData.is_selling_online && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                <FloatingSelect label="Monthly Sales Range" icon={Tag} name="monthly_sales_range" value={formData.monthly_sales_range} onChange={handleChange}>
                                                    <option value="">Select a range</option>
                                                    <option value="<1k">Less than $1,000</option>
                                                    <option value="1k-5k">$1,000 - $5,000</option>
                                                    <option value="5k-10k">$5,000 - $10,000</option>
                                                    <option value="10k+">More than $10,000</option>
                                                </FloatingSelect>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Step 3: Additional Info ──── */}
                                    <div className={`space-y-5 ${step === 3 ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}`}>
                                        <FloatingInput label="Instagram / Website URL (Optional)" icon={Globe} name="instagram" type="url" value={formData.instagram} onChange={handleChange} />
                                        <FloatingTextarea label="Tell us about your business (Optional)" icon={MessageSquare} name="message" value={formData.message} onChange={handleChange} rows={5} />
                                    </div>

                                    {/* ─── Navigation Buttons ──── */}
                                    <div className="flex gap-3 mt-10">
                                        {step > 1 && (
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
                                                style={{
                                                    color: THEME.primary,
                                                    border: `1.5px solid ${THEME.primaryBorder}`,
                                                    background: 'transparent',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = THEME.primaryDim;
                                                    e.currentTarget.style.borderColor = `${THEME.primary}66`;
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.borderColor = THEME.primaryBorder;
                                                }}
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                        )}

                                        {step < 3 ? (
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 active:scale-[0.98]"
                                                style={{
                                                    background: `linear-gradient(135deg, ${THEME.primary}, #0dd9a0)`,
                                                    color: THEME.bg,
                                                    boxShadow: `0 8px 24px ${THEME.primaryGlow}`,
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 36px rgba(19,236,164,0.4)`)}
                                                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.primaryGlow}`)}
                                            >
                                                Continue Application <ArrowRight className="w-4.5 h-4.5" />
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                    background: `linear-gradient(135deg, ${THEME.primary}, #0dd9a0)`,
                                                    color: THEME.bg,
                                                    boxShadow: `0 8px 24px ${THEME.primaryGlow}`,
                                                }}
                                                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = `0 8px 36px rgba(19,236,164,0.4)`; }}
                                                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 8px 24px ${THEME.primaryGlow}`)}
                                            >
                                                {loading ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(15,17,23,0.3)', borderTopColor: THEME.bg }} />
                                                        Submitting...
                                                    </span>
                                                ) : (
                                                    <>
                                                        Submit Application <ArrowRight className="w-4.5 h-4.5" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Footer */}
                                <p className="text-center text-[11px] mt-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                    By submitting this form, you agree to our{' '}
                                    <a href="/legal/terms" className="underline underline-offset-2 hover:opacity-70 transition-opacity">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="/legal/privacy" className="underline underline-offset-2 hover:opacity-70 transition-opacity">Privacy Policy</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
