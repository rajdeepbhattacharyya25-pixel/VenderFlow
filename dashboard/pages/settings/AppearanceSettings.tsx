import React from 'react';
import { Palette, Eye, ArrowUpRight, Check, Image as ImageIcon, Loader2, Plus, ExternalLink, Trash2, RefreshCw, Shield, Truck, CheckCircle2, Activity, Zap } from 'lucide-react';

export const AppearanceSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews, handleCreatePreview, previewUrl, handleDeletePreview }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Appearance', <Palette size={20} />)}

                        {/* Preview Environment Banner */}
                        <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-sm text-primary flex items-center gap-2 mb-1">
                                        <Eye size={16} /> Storefront Previews
                                    </h4>
                                    <p className="text-xs text-muted">Generate a temporary preview link to see your storefront with draft products. Max 2 active previews.</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={handleCreatePreview}
                                        disabled={previewLoading || activePreviews.length >= 2}
                                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        Generate Link
                                    </button>
                                </div>
                            </div>

                            {previewUrl && (
                                <div className="bg-white dark:bg-black/50 p-3 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <span className="text-xs font-mono text-muted">{previewUrl}</span>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
                                    >
                                        <ExternalLink size={12} /> Open Preview Link
                                    </a>
                                </div>
                            )}

                            {activePreviews.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <h5 className="font-bold text-xs text-text uppercase tracking-wider mb-2">Active Previews</h5>
                                    {activePreviews.map(preview => (
                                        <div key={preview.id} className="bg-bg p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text flex items-center gap-2">
                                                    Preview Link
                                                    {preview.published && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-[10px]">Published</span>}
                                                </div>
                                                <div className="text-xs text-muted mt-1">Expires: {new Date(preview.expires_at).toLocaleString()}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <a
                                                    href={`/preview/${preview.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                                    title="View Preview"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeletePreview(preview.id)}
                                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    title="Delete Preview"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="max-w-3xl">
                            <div className="space-y-6 mb-12">
                                <h4 className="font-bold text-lg text-text border-b border-border pb-2">Banner Configuration</h4>

                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Banner Image URL</label>
                                    <input
                                        type="text"
                                        value={settings.theme_config?.hero?.image_url || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, image_url: e.target.value } }
                                        })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none mb-2"
                                        placeholder="https://..."
                                    />
                                    {settings.theme_config?.hero?.image_url && (
                                        <div className="w-full h-32 rounded-lg overflow-hidden border border-border relative group">
                                            <img src={settings.theme_config.hero.image_url} alt="Storefront Hero Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Badge Text</label>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.badge_text || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, badge_text: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none"
                                                placeholder="e.g. New Collection 2025"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Button Text</label>
                                        <input
                                            type="text"
                                            value={settings.theme_config?.hero?.button_text || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, button_text: e.target.value } }
                                            })}
                                            className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none"
                                            placeholder="e.g. Shop Now"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Headlines & Description</label>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_1 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_1: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none font-bold placeholder:font-normal"
                                                placeholder="Top Line (e.g. ELEVATE YOUR)"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_2 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_2: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none italic placeholder:not-italic"
                                                placeholder="Middle Line (e.g. everyday)"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_3 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_3: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm text-text outline-none font-bold placeholder:font-normal"
                                                placeholder="Bottom Line (e.g. STYLE)"
                                            />
                                        </div>
                                    </div>

                                    <textarea
                                        value={settings.theme_config?.hero?.description || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, description: e.target.value } }
                                        })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text outline-none resize-none h-24"
                                        placeholder="Enter the banner description text..."
                                    />
                                </div>
                            </div>
                            <h4 className="font-bold text-lg text-text border-b border-border pb-2 mb-4">Trust Badges</h4>
                            <div className="space-y-3">
                                {(settings.trust_badges || []).map((badge, idx) => (
                                    <div key={idx} className="group relative bg-panel dark:bg-gray-800 border border-border rounded-xl p-1 transition-all hover:shadow-sm hover:border-primary/50 flex items-center pr-3">
                                        {/* Visual Icon Trigger - Simplified for now to Select but styled */}
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-neutral-800 rounded-lg group-hover:bg-primary/5 transition-colors pointer-events-none">
                                                {badge.icon === 'return' && <RefreshCw size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'shield' && <Shield size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'truck' && <Truck size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'check' && <CheckCircle2 size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'star' && <Shield size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'heart' && <Activity size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                                {badge.icon === 'zap' && <Zap size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-primary" />}
                                            </div>
                                            <select
                                                value={badge.icon}
                                                onChange={(e) => {
                                                    const newBadges = [...(settings.trust_badges || [])];
                                                    newBadges[idx] = { ...newBadges[idx], icon: e.target.value };
                                                    setSettings({ ...settings, trust_badges: newBadges });
                                                }}
                                                className="w-full h-full opacity-0 cursor-pointer absolute inset-0 title-select"
                                                aria-label="Select Icon"
                                            >
                                                <option value="return">Return Policy</option>
                                                <option value="shield">Secure Payment</option>
                                                <option value="truck">Shipping</option>
                                                <option value="check">Guarantee</option>
                                                <option value="star">Featured</option>
                                                <option value="heart">Trusted</option>
                                                <option value="zap">Fast</option>
                                            </select>
                                        </div>

                                        <div className="h-6 w-px bg-border mx-2"></div>

                                        <input
                                            type="text"
                                            value={badge.text}
                                            onChange={(e) => {
                                                const newBadges = [...(settings.trust_badges || [])];
                                                newBadges[idx] = { ...newBadges[idx], text: e.target.value };
                                                setSettings({ ...settings, trust_badges: newBadges });
                                            }}
                                            className="flex-grow bg-transparent text-sm font-medium text-text placeholder:text-muted/50 outline-none"
                                            placeholder="Enter badge text (e.g., Free Shipping)"
                                        />

                                        <button
                                            onClick={() => {
                                                const newBadges = (settings.trust_badges || []).filter((_, i) => i !== idx);
                                                setSettings({ ...settings, trust_badges: newBadges });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted/50 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove Badge"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setSettings({
                                        ...settings,
                                        trust_badges: [...(settings.trust_badges || []), { icon: 'check', text: '' }]
                                    })}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted font-bold text-xs uppercase tracking-wider hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add New Badge
                                </button>
                            </div>
                        </div>
                    </div>
                
    );
};
