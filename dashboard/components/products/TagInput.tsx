import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, Settings2, Search } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    onManageCategories?: () => void;
    placeholder?: string;
    suggestions?: string[];
}

const TagInput: React.FC<TagInputProps> = ({ 
    tags, 
    onChange, 
    onManageCategories,
    placeholder = 'Add categories...', 
    suggestions = [] 
}) => {
    const [input, setInput] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInput('');
        setShowDropdown(false);
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (input.trim()) addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
    );

    // Handle clicks outside dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-2 relative" ref={dropdownRef}>
            <div 
                className={`flex flex-wrap gap-2 p-2 bg-theme-bg border rounded-xl min-h-[46px] transition-all ${
                    showDropdown ? 'border-sky-500 ring-2 ring-sky-500/10' : 'border-theme-border'
                }`}
                onClick={() => {
                    inputRef.current?.focus();
                    setShowDropdown(true);
                }}
            >
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-600 border border-sky-500/20 rounded-full text-sm font-medium animate-in zoom-in-95 duration-200"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            title={`Remove ${tag}`}
                            className="hover:text-sky-700 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                <div className="flex-1 min-w-[120px] flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setShowDropdown(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        className="w-full bg-transparent border-none outline-none text-theme-text placeholder-theme-muted text-sm py-1"
                    />
                    <button 
                        type="button"
                        title={showDropdown ? "Close category list" : "Open category list"}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(!showDropdown);
                        }}
                        className={`p-1 hover:bg-theme-border/20 rounded-lg transition-all ${showDropdown ? 'rotate-180 text-sky-500' : 'text-theme-muted'}`}
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-2 z-[60] bg-theme-panel border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col max-h-[300px]">
                    <div className="p-2 border-b border-theme-border/50 bg-theme-bg/30">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                            <input 
                                type="text"
                                value={input}
                                autoFocus
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Search or add new..."
                                className="w-full bg-theme-bg border-none outline-none text-xs text-theme-text py-2 pl-9 pr-3 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {input && !suggestions.includes(input) && (
                            <button
                                type="button"
                                onClick={() => addTag(input)}
                                className="w-full text-left px-4 py-3 hover:bg-sky-500/10 text-sm text-theme-text transition-colors flex items-center gap-3 group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                    <Plus size={16} />
                                </div>
                                <div>
                                    <span className="block font-medium">Add "{input}"</span>
                                    <span className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold">New Category</span>
                                </div>
                            </button>
                        )}

                        {filteredSuggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => addTag(suggestion)}
                                className="w-full text-left px-4 py-2.5 hover:bg-theme-border/20 text-sm text-theme-text transition-colors flex items-center justify-between group rounded-xl"
                            >
                                <span className="font-medium">{suggestion}</span>
                                <Plus size={14} className="opacity-0 group-hover:opacity-100 text-sky-500" />
                            </button>
                        ))}
                    </div>

                    {onManageCategories && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDropdown(false);
                                onManageCategories();
                            }}
                            className="w-full p-4 bg-theme-bg/50 border-t border-theme-border/50 hover:bg-sky-500/5 text-sky-500 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:gap-3 group"
                        >
                            <Settings2 size={14} className="group-hover:rotate-45 transition-transform" />
                            Manage Category List
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagInput;
