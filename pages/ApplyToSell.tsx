import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Events } from '../lib/analytics';
import { TopBar } from '../components/TopBar';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, ChevronLeft, Store } from 'lucide-react';

export default function ApplyToSell() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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
            // Basic validation
            if (!formData.name || !formData.email || !formData.phone || !formData.business_name || !formData.city || !formData.category) {
                throw new Error("Please fill in all required fields.");
            }

            // Submit to Supabase
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

            Events.applicationSubmitted({ category: formData.category });
            setSuccess(true);
            window.scrollTo(0, 0);

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit application.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-body">
                <TopBar />
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold font-display text-gray-900 mb-2">Application Received</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Thank you for your interest in VenderFlow. Our team will review your application and contact you within 24 hours.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-emerald-700 transition"
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-body">
            <TopBar />

            <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </button>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-emerald-600 px-6 py-8 md:px-10 md:py-12 text-center text-white">
                            <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-xl backdrop-blur-sm mb-4">
                                <Store className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold font-display mb-3 tracking-tight">Apply to Sell</h1>
                            <p className="text-emerald-100 text-lg max-w-lg mx-auto leading-relaxed">
                                Join our curated community of premium sellers. We provide the tools, you provide the talent.
                            </p>
                        </div>

                        <div className="p-6 md:p-10">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Personal Details</h3>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                                            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="John Doe" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                                            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="john@example.com" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone / WhatsApp *</label>
                                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="+1 (555) 000-0000" />
                                        </div>
                                    </div>
                                </div>

                                {/* Business Info */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Business Profile</h3>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business / Brand Name *</label>
                                            <input required type="text" name="business_name" value={formData.business_name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="My Awesome Brand" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                                            <select required name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white">
                                                <option value="">Select a category</option>
                                                <option value="fashion">Fashion & Apparel</option>
                                                <option value="electronics">Electronics & Gadgets</option>
                                                <option value="home">Home & Living</option>
                                                <option value="beauty">Health & Beauty</option>
                                                <option value="food">Food & Beverages</option>
                                                <option value="art">Art & Handmade</option>
                                                <option value="services">Digital Products / Services</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / Location *</label>
                                            <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="New York, NY" />
                                        </div>

                                        <div className="md:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <label className="flex items-center cursor-pointer">
                                                <input type="checkbox" name="is_selling_online" checked={formData.is_selling_online} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                <span className="ml-3 text-sm font-semibold text-gray-900">Are you currently selling online?</span>
                                            </label>
                                        </div>

                                        {formData.is_selling_online && (
                                            <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Monthly Sales Online</label>
                                                <select name="monthly_sales_range" value={formData.monthly_sales_range} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white">
                                                    <option value="">Select a range</option>
                                                    <option value="<1k">Less than $1,000</option>
                                                    <option value="1k-5k">$1,000 - $5,000</option>
                                                    <option value="5k-10k">$5,000 - $10,000</option>
                                                    <option value="10k+">More than $10,000</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Optional Info */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Additional Information <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instagram / Website URL</label>
                                            <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="https://instagram.com/yourbrand" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tell us about your business</label>
                                            <textarea name="message" value={formData.message} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none" placeholder="What makes your products special?"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.99]"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Submitting...
                                            </span>
                                        ) : (
                                            <>
                                                Submit Application <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-gray-500 mt-4">
                                        By submitting this form, you agree to our Terms of Service and Privacy Policy.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
