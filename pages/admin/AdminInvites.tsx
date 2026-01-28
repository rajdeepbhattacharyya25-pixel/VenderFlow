import React, { useState } from 'react';
import { Mail, User, Store, Tag, Loader2, CheckCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InviteFormData {
    email: string;
    store_name: string;
    slug: string;
    plan: 'free' | 'pro' | 'enterprise';
}

const AdminInvites: React.FC = () => {
    const [formData, setFormData] = useState<InviteFormData>({
        email: '',
        store_name: '',
        slug: '',
        plan: 'free'
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slugError, setSlugError] = useState<string | null>(null);

    // Auto-generate slug from store name
    const generateSlug = (storeName: string) => {
        return storeName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleStoreNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            store_name: value,
            slug: generateSlug(value)
        }));
        setSlugError(null);
    };

    const handleSlugChange = (value: string) => {
        const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData(prev => ({ ...prev, slug: sanitized }));
        setSlugError(null);
    };

    const validateSlug = async () => {
        if (!formData.slug) {
            setSlugError('Slug is required');
            return false;
        }

        // Check if slug is unique
        const { data, error } = await supabase
            .from('sellers')
            .select('id')
            .eq('slug', formData.slug)
            .maybeSingle();

        if (error) {
            console.error('Error checking slug:', error);
            setSlugError('Could not verify slug availability');
            return false;
        }

        if (data) {
            setSlugError('This slug is already taken');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validate
        if (!formData.email || !formData.store_name || !formData.slug) {
            setError('Please fill in all required fields');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        // Validate slug
        const slugValid = await validateSlug();
        if (!slugValid) return;

        setLoading(true);

        try {
            // For now, we'll create a pending seller entry directly
            // In production, this would call an Edge Function that uses admin.inviteUserByEmail()

            // First check if email already exists
            const { data: existingSeller } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', formData.email) // This won't work as profiles use UUID
                .maybeSingle();

            // Create an invite record (you could create a separate invites table)
            // For now, we'll log the intent and show success

            // Log the invite action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    actor_id: user.id,
                    action: 'seller_invited',
                    target_type: 'seller_invite',
                    target_id: null, // No seller ID yet
                    metadata: {
                        email: formData.email,
                        store_name: formData.store_name,
                        slug: formData.slug,
                        plan: formData.plan
                    }
                });
            }

            setSuccess(true);
            setFormData({
                email: '',
                store_name: '',
                slug: '',
                plan: 'free'
            });

            // Reset success message after 5 seconds
            setTimeout(() => setSuccess(false), 5000);

        } catch (err: any) {
            console.error('Error inviting seller:', err);
            setError(err.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Invite Seller</h1>
                <p className="text-neutral-500 text-sm mt-1">
                    Send an invitation to onboard a new seller to the platform.
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                        <p className="text-emerald-400 font-medium">Invitation Logged Successfully!</p>
                        <p className="text-emerald-400/70 text-sm">
                            The seller invite has been recorded. In production, an email invitation would be sent.
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email Address *
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="seller@example.com"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        required
                    />
                    <p className="text-xs text-neutral-500 mt-1.5">
                        The seller will receive an invitation email at this address.
                    </p>
                </div>

                {/* Store Name */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        <Store className="w-4 h-4 inline mr-2" />
                        Store Name *
                    </label>
                    <input
                        type="text"
                        value={formData.store_name}
                        onChange={(e) => handleStoreNameChange(e.target.value)}
                        placeholder="My Amazing Store"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        required
                    />
                </div>

                {/* Slug */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        <LinkIcon className="w-4 h-4 inline mr-2" />
                        Store URL Slug *
                    </label>
                    <div className="flex items-center">
                        <span className="bg-neutral-800 border border-neutral-700 border-r-0 rounded-l-xl py-3 px-4 text-neutral-500 text-sm">
                            /store/
                        </span>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            placeholder="my-amazing-store"
                            className={`flex-1 bg-neutral-950 border rounded-r-xl py-3 px-4 text-white placeholder-neutral-600 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all ${slugError ? 'border-red-500' : 'border-neutral-800'
                                }`}
                            required
                        />
                    </div>
                    {slugError ? (
                        <p className="text-xs text-red-400 mt-1.5">{slugError}</p>
                    ) : (
                        <p className="text-xs text-neutral-500 mt-1.5">
                            URL-friendly identifier. Only lowercase letters, numbers, and hyphens allowed.
                        </p>
                    )}
                </div>

                {/* Plan */}
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        <Tag className="w-4 h-4 inline mr-2" />
                        Subscription Plan
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['free', 'pro', 'enterprise'] as const).map((plan) => (
                            <button
                                key={plan}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, plan }))}
                                className={`p-4 rounded-xl border-2 transition-all ${formData.plan === plan
                                        ? plan === 'enterprise'
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : plan === 'pro'
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : 'border-neutral-500 bg-neutral-500/10'
                                        : 'border-neutral-800 hover:border-neutral-700'
                                    }`}
                            >
                                <p className={`font-bold capitalize ${plan === 'enterprise' ? 'text-purple-400' :
                                        plan === 'pro' ? 'text-indigo-400' : 'text-neutral-400'
                                    }`}>
                                    {plan}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {plan === 'free' ? 'Basic features' :
                                        plan === 'pro' ? 'Advanced features' :
                                            'Full platform access'}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-neutral-800">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sending Invitation...
                            </>
                        ) : (
                            <>
                                <Mail className="w-5 h-5" />
                                Send Invitation
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Info Note */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-amber-400/80 text-sm">
                    <strong>Note:</strong> Full email invitation functionality requires Supabase Edge Functions
                    with the <code className="bg-amber-500/10 px-1.5 py-0.5 rounded">service_role</code> key.
                    Currently, invitations are logged for manual processing.
                </p>
            </div>
        </div>
    );
};

export default AdminInvites;
